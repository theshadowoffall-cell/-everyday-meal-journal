import type { CalorieValue } from "./calories";

/** Read only an unambiguous calorie value and an explicitly stated serving.
 * OCR results are unreviewed and are never inferred from nutrient amounts. */
export function extractLabelCalories(text: string): CalorieValue | undefined {
  const values = [
    ...text.matchAll(/\bcalories\s*[:\-]?\s*(\d+(?:[.,]\d+)?)(?![\d.,])/gi),
  ];
  if (values.length !== 1) return undefined;
  const calories = Number(values[0][1].replace(",", "."));
  if (!Number.isFinite(calories) || calories < 0 || calories > 1000000)
    return undefined;
  const lines = text.split(/\r?\n/).map((line) => line.trim());
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
