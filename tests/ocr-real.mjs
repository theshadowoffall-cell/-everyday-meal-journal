import { createWorker } from "tesseract.js";
import path from "node:path";
const worker = await createWorker(["eng", "fra"], 1, {
  langPath: path.resolve("public/ocr"),
  cacheMethod: "none",
});
try {
  const { data } = await worker.recognize(
    path.resolve("tests/assets/label.png"),
  );
  console.log(
    JSON.stringify({
      method: "Real Tesseract.js CPU OCR, bundled English/French",
      output: data.text,
      confidence: data.confidence,
    }),
  );
  if (
    !data.text.includes("Nutrition Facts") ||
    !data.text.includes("175") ||
    !data.text.includes("12")
  )
    throw Error("Expected reviewable label text was not found.");
} finally {
  await worker.terminate();
}
