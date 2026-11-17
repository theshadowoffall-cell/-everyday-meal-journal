import { describe, it, expect } from "vitest";
import { extractLabelCalories } from "../src/labelCalories";
describe("automatic label calories", () => {
  it("uses an explicit calorie value and metric serving without guessing", () => {
    expect(
      extractLabelCalories(
        "Nutrition Facts\nPer 175 g\nCalories 150\nProtein 12 g",
      ),
    ).toEqual({
      calories: 150,
      basisQuantity: 175,
      quantity: 175,
      unit: "g",
      source: "Scanned label (unreviewed)",
    });
  });
  it("keeps a documented household serving as one serving", () => {
    expect(
      extractLabelCalories("Nutrition Facts\nPer 1 cup (39 g)\nCalories 150")
        ?.unit,
    ).toBe("serving (1 cup (39 g))");
  });
  it("refuses missing servings, repeated calories and uncertain OCR", () => {
    for (const text of [
      "Calories 150",
      "Per 100 g\nCalories 150\nCalories 300",
      "Per 100 g\nProtein 12 g",
      "Per 0 g\nCalories 150",
      "Per 100 g\nCalories l5O",
    ])
      expect(extractLabelCalories(text)).toBeUndefined();
  });
});
