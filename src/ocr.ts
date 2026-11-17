import type { Worker } from "tesseract.js";
let worker: Worker | undefined;
let loading: Promise<Worker> | undefined;
let epoch = 0;
export async function releaseOCR() {
  epoch++;
  const active = worker;
  worker = undefined;
  loading = undefined;
  if (active) await active.terminate();
}
export async function recognize(blob: Blob, onProgress: (s: string) => void) {
  const token = epoch;
  if (!worker && !loading) {
    loading = (async () => {
      const { createWorker } = await import("tesseract.js");
      const base = new URL(import.meta.env.BASE_URL + "ocr/", location.href)
        .href;
      const w = await createWorker(["eng", "fra"], 1, {
        workerPath: base + "worker.min.js",
        corePath: base,
        langPath: base,
        workerBlobURL: false,
        cacheMethod: "none",
        logger: (m) => {
          if (token === epoch)
            onProgress(
              `${m.status}${m.progress ? ` ${Math.round(m.progress * 100)}%` : ""}`,
            );
        },
      });
      if (token !== epoch) {
        await w.terminate();
        throw Error("Scan cancelled.");
      }
      worker = w;
      return w;
    })();
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      (async () => {
        const w = worker || (await loading!);
        return (await w.recognize(blob)).data.text;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void releaseOCR();
          reject(
            Error(
              "Scanning timed out. Keep the photo and enter text manually.",
            ),
          );
        }, 90000);
      }),
    ]);
    if (token !== epoch) throw Error("Scan cancelled.");
    return result;
  } catch (e) {
    if (token === epoch) await releaseOCR();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
export async function preparePhoto(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error(
      "Use JPEG, PNG or WebP. Convert HEIC in Photos first. Manual text is also available.",
    );
  if (file.size > 20 * 1024 * 1024)
    throw Error(
      "Photo exceeds the 20 MiB input limit. Resize it in Photos first.",
    );
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          Error(
            "Photo could not be read. Choose another image or enter text manually.",
          ),
        );
      image.src = url;
    });
    const scale = Math.min(
      1,
      2400 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const c = document.createElement("canvas");
    c.width = Math.round(image.naturalWidth * scale);
    c.height = Math.round(image.naturalHeight * scale);
    c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      c.toBlob(
        (b) => (b ? resolve(b) : reject(Error("Could not prepare photo."))),
        "image/jpeg",
        0.9,
      ),
    );
    if (blob.size > 2 * 1024 * 1024)
      throw Error(
        "Prepared photo exceeds 2 MiB. Reduce its size in Photos, or save the text without a photo.",
      );
    return { blob, width: c.width, height: c.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
