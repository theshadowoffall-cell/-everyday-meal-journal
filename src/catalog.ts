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
export function searchCatalog(
  source: CatalogSource,
  query: string,
  limit = 30,
) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const compact = words.join("").replace(/[^\p{L}\p{N}]/gu, "");
  if (compact.length < 2) return [];
  return catalogs[source]
    .filter((food) => {
      const text = normalize([food.name, ...(food.aliases || [])].join(" "));
      if (words.every((word) => text.includes(word))) return true;
      // Support common unspaced spellings such as "frootloops".
      return (
        words.length === 1 &&
        text
          .replace(/[^\p{L}\p{N}]/gu, "")
          .includes(words[0].replace(/[^\p{L}\p{N}]/gu, ""))
      );
    })
    .slice(0, limit);
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
