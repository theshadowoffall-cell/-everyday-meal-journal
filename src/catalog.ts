import type { CalorieValue } from "./calories";
import canadian from "./data/canada.json";
import usda from "./data/usda.json";
export type CatalogFood = {
  id: number;
  name: string;
  kcal: number;
  updated?: string;
  aliases?: string[];
  portions?: { label: string; grams: number }[];
};
export type CatalogSource = "canada" | "usda";
export const catalogs: Record<CatalogSource, CatalogFood[]> = {
  canada: canadian,
  usda,
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
const tokens = (s: string): string[] =>
  normalize(s).match(/[\p{L}\p{N}]+/gu) || [];
const equivalent = (word: string, candidate: string) =>
  candidate === word || candidate === `${word}s` || `${candidate}s` === word;

type SearchIndex = {
  key: string;
  primary: string;
  primaryWords: string[];
  allWords: string[];
  headWords: string[];
  compact: string;
};
const searchIndexes = new WeakMap<object, SearchIndex>();
function searchIndex(food: {
  name: string;
  aliases?: string[];
  portions?: { label: string; grams: number }[];
}): SearchIndex {
  const key = [
    food.name,
    ...(food.aliases || []),
    ...(food.portions || []).map((p) => p.label),
  ].join("\0");
  const cached = searchIndexes.get(food);
  if (cached?.key === key) return cached;
  const primary = normalize(food.name);
  const primaryWords = tokens(primary);
  const fractionOfPizza =
    /\bpizza\b/i.test(food.name) &&
    (food.portions || []).some((p) => /^1\s*\/\s*\d+.*pizza/i.test(p.label));
  const allWords = tokens(
    [
      food.name,
      ...(food.aliases || []),
      ...(food.portions || []).map((p) => p.label),
      ...(fractionOfPizza ? ["slice"] : []),
    ].join(" "),
  );
  const entry = {
    key,
    primary,
    primaryWords,
    allWords,
    headWords: tokens(food.name.split(",")[0]),
    compact: allWords.join(""),
  };
  searchIndexes.set(food, entry);
  return entry;
}

/** Rank the food itself above foods that merely contain the search term. */
export function searchFoods<
  T extends {
    id: string | number;
    name: string;
    aliases?: string[];
    portions?: { label: string; grams: number }[];
  },
>(
  foods: T[],
  query: string,
  limit = Number.POSITIVE_INFINITY,
  minimumChars = 1,
): T[] {
  if (!query.trim()) return foods.slice(0, limit);
  const words = tokens(query);
  const compact = words.join("");
  if (compact.length < minimumChars) return [];
  const matches = foods.flatMap((food) => {
    const {
      primary,
      primaryWords,
      allWords,
      headWords,
      compact: compactText,
    } = searchIndex(food);
    const allMatch = words.every((word) =>
      allWords.some((w) => equivalent(word, w) || w.includes(word)),
    );
    const compactMatch = words.length === 1 && compactText.includes(compact);
    if (!allMatch && !compactMatch) return [];
    const headExact =
      headWords.length === words.length &&
      words.every((w, i) => equivalent(w, headWords[i]));
    const startsWithWords = words.every(
      (w, i) => primaryWords[i] && equivalent(w, primaryWords[i]),
    );
    const primaryExact =
      primaryWords.length === words.length && startsWithWords;
    const startsWithPrefixes = words.every((w, i) =>
      primaryWords[i]?.startsWith(w),
    );
    const primaryWholeWords = words.every((w) =>
      primaryWords.some((t) => equivalent(w, t)),
    );
    const primarySubstring = words.every((w) => primary.includes(w));
    const firstFoodWord =
      headWords.length === 1 && equivalent(words[0], headWords[0]);
    let score = primaryExact
      ? 10000
      : headExact
        ? 9000
        : startsWithWords
          ? 8000
          : startsWithPrefixes
            ? 7500 - Math.min(primaryWords[0].length - words[0].length, 30) * 10
            : primaryWholeWords
              ? 6000
              : primarySubstring
                ? 4000
                : 2000;
    if (firstFoodWord && words.length > 1) score += 1600;
    // Plain foods should precede prepared combinations; respect explicit queries.
    const requested = new Set(words);
    for (const [term, penalty] of [
      ["restaurant", 180],
      ["sandwich", 180],
      ["burger", 180],
      ["babyfood", 130],
      ["dried", 90],
      ["powder", 90],
      ["substitute", 90],
      ["with", 90],
      ["flavoured", 60],
      ["flavored", 60],
      ["feet", 170],
      ["giblets", 170],
      ["gizzard", 170],
      ["kidney", 150],
      ["heart", 150],
      ["liver", 150],
      ["dessert", 150],
      ["cake", 150],
      ["pie", 150],
      ["juice", 120],
      ["sauce", 120],
      ["canned", 80],
      ["frozen", 50],
      ["sweetened", 80],
      ["dehydrated", 100],
    ] as const) {
      if (
        primaryWords.includes(term) &&
        !requested.has(term) &&
        !(term === "with" && primaryWords.includes("skin")) &&
        !(term === "frozen" && primaryWords.includes("fresh"))
      )
        score -= penalty;
    }
    if (words.length === 1 && equivalent(words[0], "egg")) {
      if (primaryWords.includes("whole")) score += 100;
      if (primaryWords.includes("chicken")) score += 120;
      if (primaryWords.includes("raw")) score += 80;
      if (
        ["duck", "goose", "quail", "turkey"].some((species) =>
          primaryWords.includes(species),
        )
      )
        score -= 160;
    }
    if (
      words.length === 1 &&
      ("apple".startsWith(words[0]) || words[0] === "apples") &&
      primaryWords.includes("raw")
    ) {
      score += 70;
      if (primaryWords.includes("skin") && !primaryWords.includes("without"))
        score += 60;
    }
    score -= Math.min(primaryWords.length, 40);
    return [{ food, score }];
  });
  return matches
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.food.name.localeCompare(b.food.name) ||
        String(a.food.id).localeCompare(String(b.food.id)),
    )
    .slice(0, limit)
    .map((x) => x.food);
}
export function searchCatalog(
  source: CatalogSource,
  query: string,
  limit = 30,
) {
  if (!query.trim()) return [];
  return searchFoods(catalogs[source], query, limit, 2);
}
export function sourceText(
  source: CatalogSource,
  id: number,
  updated?: string,
) {
  return source === "canada"
    ? `Canadian Nutrient File 2026, food ${id}${updated ? `; energy updated ${updated}` : ""}`
    : `USDA FoodData Central SR Legacy, FDC ${id}`;
}
/** Choose only a serving weight explicitly documented for this food. */
export function catalogServing(
  food: CatalogFood,
  source: CatalogSource,
  query = "",
): CalorieValue {
  const portions = food.portions || [];
  const queryWords = tokens(query);
  const foodWords = tokens(food.name);
  const portionWords = queryWords.filter(
    (w) => !foodWords.some((f) => equivalent(w, f)) && !/^\d+$/.test(w),
  );
  const requested = portionWords.length
    ? portions.find((p) =>
        portionWords.every((w) =>
          tokens(p.label).some((t) => equivalent(w, t)),
        ),
      )
    : undefined;
  const name = normalize(food.name);
  const preferredEgg = /\begg\b/.test(name)
    ? portions.find((p) => /^(?:1\s+)?large(?:\s+egg)?$/i.test(p.label.trim()))
    : undefined;
  const preferredPizza = /\bpizza\b/.test(name)
    ? portions.find((p) => /\bslice\b/i.test(p.label)) ||
      portions.find((p) => /^1\s*\/\s*\d+.*pizza/i.test(p.label))
    : undefined;
  const ordinary = portions.find((p) =>
    /^(?:1\s+)?(?:piece|slice|serving|medium|large|cup|tablespoon|tbsp|teaspoon|tsp|bowl)\b/i.test(
      p.label,
    ),
  );
  const metricServing = ["250 ml", "175 g", "125 ml", "200 g", "30 g"]
    .map((label) =>
      portions.find((p) => p.label.trim().toLowerCase() === label),
    )
    .find(Boolean);
  const chosen =
    requested || preferredEgg || preferredPizza || ordinary || metricServing;
  const citation = sourceText(source, food.id, food.updated);
  return chosen
    ? {
        calories: (food.kcal * chosen.grams) / 100,
        basisQuantity: 1,
        quantity: 1,
        unit: chosen.label,
        source: `${citation}; ${chosen.grams} g per ${chosen.label}`,
      }
    : {
        calories: food.kcal,
        basisQuantity: 100,
        quantity: 100,
        unit: "g",
        source: citation,
      };
}
export function identifyFood(
  source: string,
): { source: CatalogSource; food: CatalogFood } | undefined {
  const match = source.match(
    /^(?:Canadian Nutrient File 2026, food (\d+)|USDA FoodData Central SR Legacy, FDC (\d+))/,
  );
  if (!match) return;
  const type: CatalogSource = match[1] ? "canada" : "usda";
  const id = Number(match[1] || match[2]);
  const food = catalogs[type].find((f) => f.id === id);
  return food ? { source: type, food } : undefined;
}
