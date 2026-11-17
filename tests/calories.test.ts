import { describe, it, expect } from "vitest";
import {
  itemCalories,
  calorieTotal,
  recipePerServing,
  validCalorieValue,
} from "../src/calories";
const egg = {
  calories: 72,
  basisQuantity: 1,
  unit: "large egg",
  quantity: 1.5,
  source: "user label",
};
describe("calorie arithmetic", () => {
  it("uses the declared serving basis and decimal quantities without rounding individual items", () => {
    expect(itemCalories(egg)).toBe(108);
    expect(
      itemCalories({
        ...egg,
        calories: 89,
        basisQuantity: 100,
        unit: "g",
        quantity: 125,
      }),
    ).toBe(111.25);
  });
  it("distinguishes unknown data from a documented zero", () => {
    expect(
      calorieTotal([
        { calorie: egg },
        {},
        { calorie: { ...egg, calories: 0 } },
      ]),
    ).toEqual({ known: 108, unknown: 1, complete: false });
  });
  it("refuses malformed or impossible values", () => {
    for (const x of [
      { ...egg, basisQuantity: 0 },
      { ...egg, quantity: -1 },
      { ...egg, calories: NaN },
      { ...egg, unit: "" },
      { ...egg, source: "" },
    ])
      expect(validCalorieValue(x)).toBe(false);
  });
  it("does not give a complete recipe total when an ingredient is unknown", () => {
    expect(recipePerServing([{ calorie: egg }, { calorie: egg }], 3)).toBe(72);
    expect(recipePerServing([{ calorie: egg }, {}], 3)).toBeUndefined();
    expect(recipePerServing([{ calorie: egg }], 0)).toBeUndefined();
  });
});
it("uses USDA documented complete portions rather than dividing their weights", async () => {
  const foods = (await import("../src/data/usda.json")).default;
  const egg = foods.find((f) => f.id === 171287)!;
  expect(egg.portions?.find((p) => p.label === "large")?.grams).toBe(50);
  const waffle = foods.find(
    (f) => f.name === "Waffles, chocolate chip, frozen, ready-to-heat",
  )!;
  expect(waffle.portions?.find((p) => p.label === "2 waffles")?.grams).toBe(70);
  const pie = foods.find(
    (f) => f.name === "Pie, Dutch Apple, Commercially Prepared",
  )!;
  expect(pie.portions?.find((p) => p.label.startsWith("0.12 pie"))?.grams).toBe(
    131,
  );
});
