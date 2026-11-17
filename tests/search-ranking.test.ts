import { describe, it, expect } from "vitest";
import { searchCatalog, searchFoods } from "../src/catalog";
describe("food search relevance", () => {
  it.each(["canada", "usda"] as const)(
    "puts plain, whole eggs ahead of sandwiches and restaurants in %s",
    (source) => {
      const results = searchCatalog(source, "egg", 30);
      expect(results.length).toBeGreaterThan(5);
      expect(results.slice(0, 5).every((f) => /^eggs?\b/i.test(f.name))).toBe(
        true,
      );
      expect(results.slice(0, 5).some((f) => /whole/i.test(f.name))).toBe(true);
      expect(
        results
          .slice(0, 10)
          .every((f) => !/burger|sandwich|restaurant/i.test(f.name)),
      ).toBe(true);
    },
  );
  it("still finds an explicitly requested restaurant sandwich", () => {
    const results = searchCatalog("usda", "burger king egg", 30);
    expect(
      results.some((f) => /burger king/i.test(f.name) && /egg/i.test(f.name)),
    ).toBe(true);
  });
  it("preserves multiword, French, unspaced and plural searches", () => {
    expect(
      searchCatalog("canada", "garlic naan").some((f) => f.id === 7912),
    ).toBe(true);
    expect(searchCatalog("canada", "naan ail").some((f) => f.id === 7912)).toBe(
      true,
    );
    expect(
      searchCatalog("canada", "frootloops").some((f) => f.id === 1248),
    ).toBe(true);
    expect(
      searchCatalog("canada", "eggs")
        .slice(0, 5)
        .every((f) => /^eggs?\b/i.test(f.name)),
    ).toBe(true);
  });
  it("places exact food descriptions before related combinations and limits results", () => {
    const results = searchCatalog("canada", "egg chicken", 5);
    expect(results.length).toBe(5);
    expect(results[0].name).toMatch(/^Egg, chicken/i);
    expect(searchCatalog("canada", "!!")).toEqual([]);
  });
  it("ranks saved foods too without changing their default order", () => {
    const foods = [
      { id: "1", name: "Burger King egg sandwich" },
      { id: "2", name: "Egg" },
      { id: "3", name: "Egg, whole, cooked" },
      { id: "4", name: "Chicken & rice", aliases: ["Chicken and rice"] },
    ];
    expect(searchFoods(foods, "egg").map((f) => f.id)).toEqual(["2", "3", "1"]);
    expect(searchFoods(foods, "").map((f) => f.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(searchFoods(foods, "chicken and rice").map((f) => f.id)).toEqual([
      "4",
    ]);
  });
  it("refreshes its name index when a saved food is renamed", () => {
    const foods = [{ id: "x", name: "Egg", aliases: ["eggs"] }];
    expect(searchFoods(foods, "egg")).toHaveLength(1);
    foods[0].name = "Rice";
    foods[0].aliases[0] = "grain";
    expect(searchFoods(foods, "egg")).toHaveLength(0);
    expect(searchFoods(foods, "rice")).toHaveLength(1);
  });
  it("prioritizes common chicken cuts while keeping explicitly requested giblets searchable", () => {
    const top = searchCatalog("canada", "chicken", 10);
    expect(top.every((f) => !/giblets|feet|liver|gizzard/i.test(f.name))).toBe(
      true,
    );
    expect(
      searchCatalog("canada", "chicken giblets").some((f) =>
        /giblets/i.test(f.name),
      ),
    ).toBe(true);
  });
});
