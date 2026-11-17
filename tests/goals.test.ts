import { it, expect } from "vitest";
import { calorieDay, calorieAverage, goalStatus } from "../src/reports";
import { base, emptyData } from "../src/types";
import { exportJSON, importJSON } from "../src/backup";
import { freeze } from "./fixtures";
it("uses selected goal direction, excludes incomplete and empty days, and preserves dated history", async () => {
  freeze();
  const d = emptyData();
  const cal = (k: number) => ({
    calories: k,
    basisQuantity: 1,
    quantity: 1,
    unit: "serving",
    source: "test",
  });
  d.meals = [
    {
      ...base("a"),
      date: "2026-11-09",
      category: "Lunch",
      items: [{ name: "a", calorie: cal(100) }],
    },
    {
      ...base("b"),
      date: "2026-11-10",
      category: "Lunch",
      items: [{ name: "b", calorie: cal(300) }, { name: "unknown" }],
    },
    {
      ...base("c"),
      date: "2026-11-11",
      category: "Lunch",
      items: [{ name: "c", calorie: cal(300) }],
    },
    {
      ...base("future"),
      date: "2026-11-20",
      category: "Lunch",
      items: [{ name: "future", calorie: cal(999) }],
    },
  ];
  d.preferences[0].calorieGoals = [
    { from: "2026-11-09", target: 200, direction: "at_or_below" },
    { from: "2026-11-11", target: 300, direction: "at_or_above" },
  ];
  expect(calorieAverage(d, "2026-11-09", "2026-11-20")).toEqual({
    average: 200,
    days: 2,
    excluded: 1,
  });
  expect(calorieDay(d, "2026-11-12").hasMeals).toBe(false);
  expect(goalStatus(d, "2026-11-09", d.preferences[0].calorieGoals)).toBe(true);
  expect(
    goalStatus(d, "2026-11-10", d.preferences[0].calorieGoals),
  ).toBeUndefined();
  expect(goalStatus(d, "2026-11-11", d.preferences[0].calorieGoals)).toBe(true);
  expect(
    goalStatus(d, "2026-11-20", d.preferences[0].calorieGoals),
  ).toBeUndefined();
  const imported = await importJSON(await exportJSON(d));
  expect(imported.preferences[0].calorieGoals).toEqual(
    d.preferences[0].calorieGoals,
  );
});
