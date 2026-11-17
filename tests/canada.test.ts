import { describe, it, expect } from "vitest";
import {
  searchCatalog,
  identifyFood,
  sourceText,
  catalogs,
} from "../src/catalog";
import { itemCalories } from "../src/calories";
describe("Canadian food catalogue", () => {
  it("finds Canadian garlic naan regardless of word order and uses documented full portion weights", () => {
    const food = searchCatalog("canada", "garlic naan").find(
      (x) => x.id === 7912,
    )!;
    expect(food.name).toContain("garlic");
    expect(food.kcal).toBeCloseTo(288.462120365, 9);
    const piece = food.portions!.find((p) => p.label === "1 piece")!;
    expect(piece.grams).toBeCloseTo(100.0667763, 7);
    expect(
      Math.round(
        itemCalories({
          calories: (food.kcal * piece.grams) / 100,
          basisQuantity: 1,
          quantity: 1,
          unit: piece.label,
          source: sourceText("canada", food.id),
        })!,
      ),
    ).toBe(289);
  });
  it("uses Health Canada’s 2026 conversion weights without the obsolete 100 multiplier", () => {
    const applesauce = catalogs.canada.find((x) => x.id === 1700)!;
    expect(
      applesauce.portions!.find((p) => p.label === "250 ml")?.grams,
    ).toBeCloseTo(257.819, 3);
    const apple = catalogs.canada.find((x) => x.id === 7215)!;
    expect(apple.portions!.find((p) => p.label === "1 medium")?.grams).toBe(
      167,
    );
    expect(
      apple.portions!.some((p) => /refuse|core and stem/i.test(p.label)),
    ).toBe(false);
  });
  it("distinguishes sources with overlapping IDs and keeps older USDA snapshots recognizable", () => {
    const ca = identifyFood(sourceText("canada", 7912));
    expect(ca?.source).toBe("canada");
    expect(ca?.food.id).toBe(7912);
    const us = identifyFood(
      "USDA FoodData Central SR Legacy, FDC 171287; 50 g per large",
    );
    expect(us?.source).toBe("usda");
    expect(us?.food.portions?.find((p) => p.label === "large")?.grams).toBe(50);
  });
  it("matches French descriptions, limits results, and never includes empty calorie data", () => {
    expect(searchCatalog("canada", "naan ail").some((f) => f.id === 7912)).toBe(
      true,
    );
    expect(searchCatalog("canada", "chicken", 5).length).toBeLessThanOrEqual(5);
    expect(searchCatalog("canada", "!!")).toEqual([]);
    expect(catalogs.canada).toHaveLength(5993);
    expect(
      catalogs.canada.every((f) => Number.isFinite(f.kcal) && f.kcal >= 0),
    ).toBe(true);
  });
  it("retains the actual energy-data date for branded entries", () => {
    const food = searchCatalog("canada", "froot loops").find(
      (f) => f.id === 1248,
    )!;
    expect(
      searchCatalog("canada", "frootloops").some((f) => f.id === 1248),
    ).toBe(true);
    expect(food.kcal).toBe(396);
    expect(food.updated).toBe("2012-01-19");
    expect(sourceText("canada", food.id, food.updated)).toContain(
      "energy updated 2012-01-19",
    );
  });
});
