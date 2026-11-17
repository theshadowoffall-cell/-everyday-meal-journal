import type { CalorieValue } from "./calories";

/** Read only an unambiguous calorie value and an explicitly stated serving.
 * OCR results are unreviewed and are never inferred from nutrient amounts. */
export function extractLabelCalories(text: string): CalorieValue | undefined {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const calorieLines = lines.filter((line) => /\bcalories\b/i.test(line));
  if (calorieLines.length !== 1) return undefined;
  // Reject multiple columns, units such as kJ, negative values, and ambiguous
  // thousands separators instead of interpreting OCR text as certain calories.
  const value = calorieLines[0].match(
    /^calories\s*:?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:kcal)?\s*$/i,
  );
  if (!value) return undefined;
  const calories = Number(value[1].replace(",", "."));
  if (!Number.isFinite(calories) || calories < 0 || calories > 1000000)
    return undefined;
  const servingLines = lines.filter((line) =>
    /^(?:per|serving size|portion)\s*[:\-]?\s*\S/i.test(line),
  );
  if (servingLines.length !== 1) return undefined;
  const serving = servingLines[0]
    .replace(/^(?:per|serving size|portion)\s*[:\-]?\s*/i, "")
    .trim();
  const metric = serving.match(/^(\d+(?:[.,]\d+)?)\s*(g|ml)\s*$/i);
  const quantity = metric ? Number(metric[1].replace(",", ".")) : 1;
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > 1000000 ||
    serving.length > 80
  )
    return undefined;
  const unit = metric ? metric[2].toLowerCase() : `serving (${serving})`;
  return {
    calories,
    basisQuantity: quantity,
    quantity,
    unit,
    source: "Scanned label (unreviewed)",
  };
}
