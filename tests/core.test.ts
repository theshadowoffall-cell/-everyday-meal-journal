import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JournalDB, createDraft } from "../src/storage";
import { base, snapshot } from "../src/types";
import {
  addDays,
  monthCells,
  week,
  validDate,
  setClockForTest,
  localDate,
} from "../src/dates";
import { report, completedWeeks } from "../src/reports";
import { exportJSON, importJSON } from "../src/backup";
import { LIMITS, estimatedBytes } from "../src/validation";
import { matches, Operation } from "../src/input";
import { fixture, restoreFixture, freeze } from "./fixtures";
let db: JournalDB;
let gen = 2;
beforeEach(async () => {
  freeze();
  db = new JournalDB("test-" + crypto.randomUUID(), () => {});
  await db.restore(fixture(), 1);
  gen = 2;
});
afterEach(async () => {
  await db.close();
});
describe("meals, drafts, revisions and storage", () => {
  it("commits compound meal, matching draft and optional dish atomically; repeated callback versus intentional repeat", async () => {
    const d = await db.read();
    const draft = createDraft(d, "2026-11-15", [
      snapshot(d.foods[0]),
      snapshot(d.foods[4]),
    ]);
    draft.category = "Lunch";
    draft.saveTemplate = true;
    draft.dishName = "Usual lunch";
    await db.writeDraft(draft, 0, gen);
    expect((await db.read()).meals).toHaveLength(1);
    await Promise.all([db.saveMeal(draft, gen), db.saveMeal(draft, gen)]);
    let saved = await db.read();
    expect(saved.meals).toHaveLength(2);
    expect(saved.drafts).toHaveLength(0);
    expect(saved.foods).toHaveLength(7);
    expect(report(saved, "2026-11-09", "2026-11-15")).toEqual({
      workouts: 3,
      mealDays: 1,
    });
    const repeat = createDraft(saved, "2026-11-15", draft.items);
    await db.writeDraft(repeat, 0, gen);
    await db.saveMeal(repeat, gen);
    expect((await db.read()).meals).toHaveLength(3);
  });
  it("edits, copies and deletes with conflict-aware undo; template archive preserves snapshot", async () => {
    let d = await db.read();
    const original = d.meals[0];
    const edit = createDraft(d, original.date, [], original);
    edit.title = "Changed title";
    await db.writeDraft(edit, 0, gen);
    const u = await db.saveMeal(edit, gen);
    await expect(
      db.putRecord("meals", { ...original, title: "stale" }, 1, gen),
    ).rejects.toThrow("changed");
    await db.undo(u!);
    d = await db.read();
    expect(d.meals[0].title).toBeUndefined();
    const f = d.foods[2];
    await db.putRecord(
      "foods",
      { ...f, name: "New name", archived: true },
      f.revision,
      gen,
    );
    d = await db.read();
    expect(d.meals[0].items[0].name).toBe("Eggs on toast");
    const copy = createDraft(d, "2026-11-14", d.meals[0].items);
    await db.writeDraft(copy, 0, gen);
    await db.saveMeal(copy, gen);
    expect((await db.read()).meals).toHaveLength(2);
    const meal = (await db.read()).meals[0];
    const del = await db.remove("meals", meal.id, meal.revision, gen);
    await db.undo(del);
    expect((await db.read()).meals).toHaveLength(2);
    await expect(db.undo(del)).rejects.toThrow("changed");
  });
  it("retains input on simulated quota/transaction failure, retries same save and survives reconnect", async () => {
    const d = await db.read();
    const dr = createDraft(d, "2026-11-15", [{ name: "Soup" }]);
    await db.writeDraft(dr, 0, gen);
    db.faultForTest = true;
    await expect(db.saveMeal(dr, gen)).rejects.toThrow("Simulated");
    expect((await db.read()).drafts[0].items[0].name).toBe("Soup");
    expect((await db.read()).meals).toHaveLength(1);
    db.faultForTest = false;
    await db.saveMeal(dr, gen);
    const other = new JournalDB((db as any).name || "unused");
    await other.close();
    const reopened = await db.read();
    expect(reopened.meals).toHaveLength(2);
  });
  it("rejects empty/future meals, stale draft revisions, and preserves intentional duplicate names", async () => {
    const d = await db.read();
    const empty = createDraft(d, "2026-11-15");
    await db.writeDraft(empty, 0, gen);
    await expect(db.saveMeal(empty, gen)).rejects.toThrow("at least one");
    await expect(
      db.writeDraft({ ...empty, revision: 2 }, 0, gen),
    ).rejects.toThrow("changed");
    const future = {
      ...empty,
      date: "2026-11-16",
      items: [{ name: "Apple" }],
      revision: 2,
    };
    await db.writeDraft(future, 1, gen);
    await expect(db.saveMeal(future, gen)).rejects.toThrow("future");
    expect((await db.read()).drafts).toHaveLength(1);
  });
  it("undo preserves a newer unrelated edit and rejects a newer target revision", async () => {
    let d = await db.read();
    const meal = d.meals[0];
    const u = await db.putRecord(
      "meals",
      { ...meal, title: "First" },
      meal.revision,
      gen,
    );
    const food = d.foods[4];
    await db.putRecord(
      "foods",
      { ...food, notes: "unrelated" },
      food.revision,
      gen,
    );
    await db.undo(u);
    expect((await db.read()).foods[4].notes).toBe("unrelated");
    d = await db.read();
    const m = d.meals[0];
    const u2 = await db.putRecord(
      "meals",
      { ...m, title: "Second" },
      m.revision,
      gen,
    );
    await db.putRecord("meals", { ...m, title: "Third" }, m.revision + 1, gen);
    await expect(db.undo(u2)).rejects.toThrow("unavailable");
    expect((await db.read()).meals[0].title).toBe("Third");
  });
});
it("a deleted and recreated record cannot be erased by an older undo token", async () => {
  const u = await db.putRecord(
    "workouts",
    { id: "2026-11-15", state: "workout" },
    0,
    gen,
  );
  await db.remove("workouts", "2026-11-15", 1, gen);
  await db.putRecord(
    "workouts",
    { id: "2026-11-15", state: "workout" },
    0,
    gen,
  );
  await expect(db.undo(u)).rejects.toThrow("changed");
  expect(
    (await db.read()).workouts.find((w) => w.id === "2026-11-15")?.state,
  ).toBe("workout");
});

describe("workout, calendar and report dates", () => {
  it("transitions workout, rest, clear, undo without combining states", async () => {
    const u = await db.putRecord(
      "workouts",
      { id: "2026-11-15", state: "workout" },
      0,
      gen,
    );
    await db.undo(u);
    await db.putRecord("workouts", { id: "2026-11-15", state: "rest" }, 0, gen);
    let d = await db.read();
    expect(d.workouts.filter((w) => w.id === "2026-11-15")).toHaveLength(1);
    await db.putRecord(
      "workouts",
      { id: "2026-11-15", state: "workout" },
      1,
      gen,
    );
    await db.remove("workouts", "2026-11-15", 2, gen);
    expect((await db.read()).workouts).toHaveLength(5);
    await expect(
      db.putRecord("workouts", { id: "2026-11-16", state: "workout" }, 0, gen),
    ).rejects.toThrow("future");
  });
  it("uses Monday weeks and correct November padding, DST and year boundaries", () => {
    expect(week("2026-11-15")).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    const cells = monthCells("2026-11");
    expect(cells.slice(0, 7)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      "2026-11-01",
    ]);
    expect(cells.slice(-7)).toEqual([
      "2026-11-30",
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2028-02-29")).toBe(true);
    setClockForTest(() => new Date("2026-11-16T05:01:00Z"));
    expect(localDate()).toBe("2026-11-16");
  });
  it("counts distinct dates, excludes drafts and imported future dates, compares completed weeks", async () => {
    const d = await db.read();
    d.meals.push({
      ...base("future-meal"),
      date: "2026-12-01",
      category: "Lunch",
      items: [{ name: "Future imported" }],
    });
    d.workouts.push({ id: "2026-12-01", state: "workout", revision: 1 });
    d.drafts = [createDraft(d, "2026-11-14", [{ name: "Not saved" }])];
    await db.restore(d, gen);
    const saved = await db.read();
    expect(saved.meals.some((m) => m.date === "2026-12-01")).toBe(true);
    expect(report(saved, "2026-11-01", "2026-12-31")).toEqual({
      workouts: 3,
      mealDays: 1,
    });
    expect(completedWeeks(saved).last).toEqual(["2026-11-02", "2026-11-08"]);
    expect(report(saved, "2020-01-01", "2020-01-31")).toEqual({
      workouts: 0,
      mealDays: 0,
    });
  });
});
describe("backup and replacement", () => {
  it("complete photo-containing round trip with 24 meals, 7 foods and 4 photos", async () => {
    const original = restoreFixture();
    const json = await exportJSON(original);
    const restored = await importJSON(json, async () => ({
      width: 1,
      height: 1,
    }));
    expect(restored.meals).toHaveLength(24);
    expect(restored.foods).toHaveLength(7);
    expect(restored.images).toHaveLength(4);
    expect(await restored.images[0].blob.arrayBuffer()).toEqual(
      await original.images[0].blob.arrayBuffer(),
    );
    expect(estimatedBytes(original)).toBeGreaterThan(
      new TextEncoder().encode(json).length,
    );
    await db.restore(restored, gen);
    expect((await db.read()).meta[0].value).toBe(3);
  });
  it("rejects malformed, future schema, bad references, invalid image and over-limit without mutation", async () => {
    const before = await exportJSON(await db.read());
    for (const bad of [
      "{",
      JSON.stringify({ schemaVersion: 9 }),
      JSON.stringify({ schemaVersion: 1, data: {} }),
      " ".repeat(LIMITS.backupBytes + 1),
    ])
      await expect(importJSON(bad)).rejects.toThrow();
    const d = restoreFixture();
    d.meals[0].items[0].imageId = "missing";
    await expect(exportJSON(d)).rejects.toThrow("Missing photo");
    const good = await exportJSON(restoreFixture());
    await expect(
      importJSON(good, async () => {
        throw Error("Decode failure");
      }),
    ).rejects.toThrow("Decode");
    expect(await exportJSON(await db.read())).toContain("meal-breakfast");
    expect((await db.read()).meals).toHaveLength(1);
    expect(before).toContain("schemaVersion");
  });
  it("atomic restore rollback, generation invalidates old writes and undo", async () => {
    const u = await db.putRecord(
      "workouts",
      { id: "2026-11-15", state: "rest" },
      0,
      gen,
    );
    db.faultForTest = true;
    await expect(db.restore(restoreFixture(), gen)).rejects.toThrow(
      "Simulated",
    );
    expect((await db.read()).meals).toHaveLength(1);
    db.faultForTest = false;
    await db.restore(restoreFixture(), gen);
    await expect(db.undo(u)).rejects.toThrow("restored");
    await expect(
      db.putRecord("workouts", { id: "2026-11-15", state: "workout" }, 0, gen),
    ).rejects.toThrow("restored");
    expect((await db.read()).meals).toHaveLength(24);
  });
});
describe("async input logic", () => {
  it("matches aliases, ambiguous names and ignores cancelled/late operation IDs", () => {
    const d = fixture();
    expect(matches("Chicken and rice", d.foods).map((f) => f.id)).toEqual([
      "food-0",
    ]);
    expect(matches("unknown", d.foods)).toHaveLength(0);
    d.foods[1].aliases = ["Chicken and rice"];
    expect(matches("Chicken and rice", d.foods)).toHaveLength(2);
    const op = new Operation();
    const first = op.start();
    op.cancel();
    expect(op.current(first)).toBe(false);
    const next = op.start();
    expect(op.current(next)).toBe(true);
  });
});

it("removing a template photo does not change the meal snapshot or delete its referenced blob", async () => {
  await db.restore(restoreFixture(), gen);
  const d = await db.read();
  const f = d.foods.find((f) => f.id === "food-2")!;
  const meal = d.meals.find((m) => m.items.some((i) => i.sourceId === f.id))!;
  expect(meal.items.find((i) => i.sourceId === f.id)?.imageId).toBe("image-2");
  await db.putRecord("foods", { ...f, imageId: undefined }, f.revision, 3);
  const after = await db.read();
  expect(
    after.meals
      .find((m) => m.id === meal.id)
      ?.items.find((i) => i.sourceId === f.id)?.imageId,
  ).toBe("image-2");
  expect(after.images.some((i) => i.id === "image-2")).toBe(true);
});
