import { it, expect } from "vitest";
import { searchCatalog, catalogServing } from "../src/catalog";
it("prioritizes normal apples and eggs and offers documented servings", () => {
  for (const source of ["canada", "usda"] as const) {
    const apple = searchCatalog(source, "app")[0];
    expect(apple.name).toMatch(/^apples?, raw/i);
    expect(apple.name).toMatch(/with skin/i);
    const egg = searchCatalog(source, "egg")[0];
    expect(egg.name).toMatch(/^egg.*whole.*raw/i);
    const serving = catalogServing(egg, source, "egg");
    expect(serving.unit).toMatch(/large/i);
    expect(serving.quantity).toBe(1);
    expect(serving.calories).toBeGreaterThan(50);
    expect(serving.calories).toBeLessThan(100);
  }
});
it("finds pizza slices and selects only documented portions", () => {
  for (const source of ["canada", "usda"] as const) {
    const food = searchCatalog(source, "pizza slice")[0];
    expect(food.name).toMatch(/^pizza,/i);
    const serving = catalogServing(food, source, "pizza slice");
    expect(serving.unit).toMatch(/slice|1\/\d+.*pizza/i);
    expect(food.portions?.some((p) => p.label === serving.unit)).toBe(true);
  }
});

it("uses a documented metric serving where no piece or slice exists", () => {
  const food = {
    id: 1,
    name: "Milk",
    kcal: 50,
    portions: [
      { label: "100 ml", grams: 103 },
      { label: "250 ml", grams: 258 },
    ],
  };
  const serving = catalogServing(food, "canada", "milk");
  expect(serving.unit).toBe("250 ml");
  expect(serving.calories).toBe(129);
});
