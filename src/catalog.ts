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
function searchIndex(food: { name: string; aliases?: string[] }): SearchIndex {
  const key = [food.name, ...(food.aliases || [])].join("\0");
  const cached = searchIndexes.get(food);
  if (cached?.key === key) return cached;
  const primary = normalize(food.name);
  const primaryWords = tokens(primary);
  const allWords = tokens([food.name, ...(food.aliases || [])].join(" "));
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
  T extends { id: string | number; name: string; aliases?: string[] },
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
    const primaryWholeWords = words.every((w) =>
      primaryWords.some((t) => equivalent(w, t)),
    );
    const primarySubstring = words.every((w) => primary.includes(w));
    let score = primaryExact
      ? 10000
      : headExact
        ? 9000
        : startsWithWords
          ? 8000
          : primaryWholeWords
            ? 6000
            : primarySubstring
              ? 4000
              : 2000;
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
    ] as const) {
      if (primaryWords.includes(term) && !requested.has(term)) score -= penalty;
    }
    if (words.length === 1 && equivalent(words[0], "egg")) {
      if (primaryWords.includes("whole")) score += 100;
      if (primaryWords.includes("chicken")) score += 120;
      if (primaryWords.includes("raw")) score += 12;
      if (
        ["duck", "goose", "quail", "turkey"].some((species) =>
          primaryWords.includes(species),
        )
      )
        score -= 160;
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
