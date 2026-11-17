import { type Data } from "./types";
import { assert, LIMITS, validateData } from "./validation";
export async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 16384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(binary);
}
export async function exportJSON(d: Data) {
  validateData(d);
  const images = await Promise.all(
    d.images.map(async ({ blob, ...i }) => ({
      ...i,
      data: await blobToBase64(blob),
    })),
  );
  const text = JSON.stringify({
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    data: { ...d, images },
  });
  assert(
    new TextEncoder().encode(text).length <= LIMITS.backupBytes,
    "Backup exceeds 24 MiB.",
  );
  return text;
}
export async function decodeImage(
  blob: Blob,
): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Image decode timed out.")),
        15000,
      );
      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(
          Error("This photo could not be decoded. Use JPEG, PNG or WebP."),
        );
      };
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function importJSON(
  text: string,
  decode = decodeImage,
): Promise<Data> {
  assert(
    new TextEncoder().encode(text).length <= LIMITS.backupBytes,
    "Backup exceeds the 24 MiB limit.",
  );
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw Error("This is not valid JSON. Current data is unchanged.");
  }
  assert(
    raw?.schemaVersion === 1 || raw?.schemaVersion === 2,
    "Unsupported backup version. Current data is unchanged.",
  );
  assert(
    Array.isArray(raw.data?.images) && raw.data.images.length <= LIMITS.images,
    "Invalid image list.",
  );
  const data: Data = { ...raw.data, images: [] };
  for (const i of raw.data.images) {
    assert(
      typeof i.data === "string" &&
        i.data.length <= 4 * Math.ceil(LIMITS.imageBytes / 3) &&
        /^[A-Za-z0-9+/]*={0,2}$/.test(i.data),
      "Invalid or oversized image encoding.",
    );
    const binary = atob(i.data);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: i.mime });
    data.images.push({
      id: i.id,
      mime: i.mime,
      width: i.width,
      height: i.height,
      blob,
    });
  }
  validateData(data);
  for (const i of data.images) {
    const actual = await decode(i.blob);
    assert(
      actual.width === i.width && actual.height === i.height,
      "Photo dimensions do not match the backup.",
    );
  }
  return data;
}
export function download(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
