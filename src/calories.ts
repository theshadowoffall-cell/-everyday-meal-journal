/** Calorie values use a documented serving basis; no unit conversions are assumed. */
export type CalorieValue = {
  calories: number;
  basisQuantity: number;
  unit: string;
  quantity: number;
  source: string;
};
export function validCalorieValue(v: unknown): v is CalorieValue {
  if (!v || typeof v !== "object") return false;
  const x = v as CalorieValue;
  return (
    Number.isFinite(x.calories) &&
    x.calories >= 0 &&
    x.calories <= 1000000 &&
    Number.isFinite(x.basisQuantity) &&
    x.basisQuantity > 0 &&
    x.basisQuantity <= 1000000 &&
    Number.isFinite(x.quantity) &&
    x.quantity > 0 &&
    x.quantity <= 1000000 &&
    typeof x.unit === "string" &&
    x.unit.trim().length > 0 &&
    x.unit.length <= 100 &&
    typeof x.source === "string" &&
    x.source.trim().length > 0 &&
    x.source.length <= 1000 &&
    Number.isFinite((x.calories * x.quantity) / x.basisQuantity)
  );
}
export function itemCalories(value?: CalorieValue): number | undefined {
  if (!validCalorieValue(value)) return undefined;
  const result = (value.calories * value.quantity) / value.basisQuantity;
  return Number.isFinite(result) ? result : undefined;
}
export function calorieTotal(
  items: Array<{ calorie?: CalorieValue; calorieInputEmpty?: boolean }>,
) {
  let known = 0,
    unknown = 0;
  for (const item of items) {
    const n = item.calorieInputEmpty ? undefined : itemCalories(item.calorie);
    if (n === undefined) unknown++;
    else known += n;
  }
  return { known, unknown, complete: unknown === 0 };
}
export function recipePerServing(
  items: Array<{ calorie?: CalorieValue; calorieInputEmpty?: boolean }>,
  servings: number,
): number | undefined {
  if (!Number.isFinite(servings) || servings <= 0) return undefined;
  const total = calorieTotal(items);
  return total.complete && items.length ? total.known / servings : undefined;
}
