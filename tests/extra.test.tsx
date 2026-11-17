// @vitest-environment jsdom
import "fake-indexeddb/auto";
import React from "react";
import { Blob as NodeBlob } from "node:buffer";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { App } from "../src/App";
import { Modal } from "../src/ui";
import { JournalDB, createDraft } from "../src/storage";
import { emptyData, snapshot } from "../src/types";
import { fixture, freeze } from "./fixtures";
import { setClockForTest } from "../src/dates";
Object.assign(globalThis, { Blob: NodeBlob, React });
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};
let db: JournalDB;
beforeEach(() => {
  freeze();
  db = new JournalDB("extra-" + crypto.randomUUID(), () => {});
});
afterEach(async () => {
  cleanup();
  await db.close();
});
it("fresh launch has no fabricated records, pins or calories; one and two pins render real tiles", async () => {
  render(<App database={db} />);
  await screen.findByRole("heading", { name: "Today" });
  expect(screen.getByText("Pin a meal")).toBeTruthy();
  expect((await db.read()).meals).toHaveLength(0);
  expect(screen.queryByText("Chicken & rice")).toBeNull();
  cleanup();
  const d = fixture();
  d.preferences[0].pins = ["food-0"];
  await db.restore(d, 1);
  render(<App database={db} />);
  await screen.findByRole("heading", { name: "Today" });
  expect(screen.getAllByRole("button", { name: /^Add Chicken/ })).toHaveLength(
    1,
  );
  expect(
    screen.queryByRole("button", { name: "Add Yogurt & berries" }),
  ).toBeNull();
});
it("modal Escape uses current close handler and focus stays in sheet", () => {
  const first = vi.fn(),
    second = vi.fn();
  const { rerender } = render(
    <Modal title="Review" onClose={first}>
      <button>Last target</button>
    </Modal>,
  );
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Close" }),
  );
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(screen.getByText("Last target"));
  rerender(
    <Modal title="Review" onClose={second}>
      <button>Last target</button>
    </Modal>,
  );
  fireEvent.keyDown(document, { key: "Escape" });
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});
it("midnight changes idle Today but preserves historical selection and drafts", async () => {
  await db.restore(fixture(), 1);
  render(<App database={db} />);
  await screen.findByRole("heading", { name: "Today" });
  setClockForTest(() => new Date("2026-11-16T05:01:00Z"));
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(screen.getByText("Monday, November 16")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
  await screen.findByRole("dialog");
  fireEvent.change(screen.getByLabelText("Write a meal"), {
    target: { value: "Midnight draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  setClockForTest(() => new Date("2026-11-17T05:01:00Z"));
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(screen.getByText("Monday, November 16")).toBeTruthy();
  await waitFor(async () =>
    expect((await db.read()).drafts[0].date).toBe("2026-11-16"),
  );
});
it("separate connection reload sees saves, stale editors fail and restores reject older generation", async () => {
  const name = "cross-" + crypto.randomUUID();
  const a = new JournalDB(name, () => {}),
    b = new JournalDB(name, () => {});
  try {
    await a.restore(fixture(), 1);
    const current = await a.read();
    const dr = createDraft(current, "2026-11-15", [snapshot(current.foods[0])]);
    await a.writeDraft(dr, 0, 2);
    await a.saveMeal(dr, 2);
    expect((await b.read()).meals).toHaveLength(2);
    const food = (await b.read()).foods[0];
    await a.putRecord(
      "foods",
      { ...food, name: "Changed in tab A" },
      food.revision,
      2,
    );
    await expect(
      b.putRecord("foods", { ...food, name: "Tab B stale" }, food.revision, 2),
    ).rejects.toThrow("changed");
    await a.restore(fixture(), 2);
    await expect(b.writeDraft(dr, 0, 2)).rejects.toThrow("restored");
    expect((await b.read()).meals).toHaveLength(1);
  } finally {
    await a.close();
    await b.close();
  }
});
