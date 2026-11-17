import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { JournalDB, createDraft } from "../src/storage";
import { snapshot, base } from "../src/types";
import { calorieTotal, itemCalories } from "../src/calories";
import { exportJSON, importJSON } from "../src/backup";
import { fixture, freeze } from "./fixtures";
it("commits measured items and recipe, preserves historical values after edits, and round-trips old and new backups", async () => {
  freeze();
  const db = new JournalDB("cal-" + crypto.randomUUID(), () => {});
  try {
    await db.restore(fixture(), 1);
    let d = await db.read();
    const old = JSON.parse(await exportJSON(d));
    old.schemaVersion = 1;
    expect((await importJSON(JSON.stringify(old))).meals).toHaveLength(1);
    const calorie = {
      calories: 143,
      basisQuantity: 100,
      quantity: 50,
      unit: "g",
      source: "USDA FDC 171287",
    };
    const dr = createDraft(d, "2026-11-15", [
      { name: "Egg", calorie },
      { name: "Mystery" },
    ]);
    await db.writeDraft(dr, 0, 2);
    await db.saveMeal(dr, 2);
    d = await db.read();
    const saved = d.meals.find((m) => m.id === dr.mealId)!;
    expect(calorieTotal(saved.items)).toEqual({
      known: 71.5,
      unknown: 1,
      complete: false,
    });
    const copy = await importJSON(await exportJSON(d));
    expect(
      copy.meals.find((m) => m.id === dr.mealId)?.items[0].calorie,
    ).toEqual(calorie);
    const source = {
      ...base("new-food"),
      name: "Custom",
      favourite: false,
      archived: false,
      calorie,
    };
    await db.putRecord("foods", source, 0, 2);
    d = await db.read();
    const food = d.foods.find((f) => f.id === "new-food")!;
    const meal = createDraft(d, "2026-11-15", [snapshot(food)]);
    await db.writeDraft(meal, 0, 2);
    await db.saveMeal(meal, 2);
    await db.putRecord(
      "foods",
      { ...food, calorie: { ...calorie, calories: 200 } },
      food.revision,
      2,
    );
    d = await db.read();
    expect(
      itemCalories(d.meals.find((m) => m.id === meal.mealId)!.items[0].calorie),
    ).toBe(71.5);
    const recipe = createDraft(d, "2026-11-15", [
      { name: "Egg", calorie },
      { name: "Egg", calorie },
    ]);
    recipe.saveTemplate = true;
    recipe.dishName = "Omelet";
    recipe.recipeServings = 2;
    await db.writeDraft(recipe, 0, 2);
    await db.saveMeal(recipe, 2);
    d = await db.read();
    expect(
      itemCalories(d.foods.find((f) => f.name === "Omelet")!.calorie),
    ).toBe(71.5);
  } finally {
    await db.close();
  }
});
it("rejects invalid calorie backup instead of admitting malformed nutrition", async () => {
  freeze();
  const d = fixture();
  (d.meals[0].items[0] as any).calorie = {
    calories: -1,
    basisQuantity: 1,
    quantity: 1,
    unit: "g",
    source: "x",
  };
  await expect(exportJSON(d)).rejects.toThrow("Invalid calorie");
});
it("survives a failed calorie save, retries without duplicates, and blocks stale undo after restore", async () => {
  freeze();
  const db = new JournalDB("calfault-" + crypto.randomUUID(), () => {});
  try {
    await db.restore(fixture(), 1);
    const d = await db.read();
    const calorie = {
      calories: 143,
      basisQuantity: 100,
      quantity: 50,
      unit: "g",
      source: "USDA FDC 171287",
    };
    const dr = createDraft(d, "2026-11-15", [{ name: "Egg", calorie }]);
    await db.writeDraft(dr, 0, 2);
    db.faultForTest = true;
    await expect(db.saveMeal(dr, 2)).rejects.toThrow("Simulated");
    expect((await db.read()).drafts[0].items[0].calorie).toEqual(calorie);
    expect((await db.read()).meals).toHaveLength(1);
    db.faultForTest = false;
    const [undo] = await Promise.all([db.saveMeal(dr, 2), db.saveMeal(dr, 2)]);
    const after = await db.read();
    expect(after.meals).toHaveLength(2);
    expect(
      calorieTotal(after.meals.find((m) => m.id === dr.mealId)!.items).known,
    ).toBe(71.5);
    await db.restore(fixture(), 2);
    await expect(db.undo(undo!)).rejects.toThrow("restored");
    expect((await db.read()).meals).toHaveLength(1);
  } finally {
    await db.close();
  }
});
