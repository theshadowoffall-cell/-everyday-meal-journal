import { validCalorieValue } from "./calories";
import { categories, type Data, type Item } from "./types";
import { validDate, localDate } from "./dates";
export const LIMITS = {
  backupBytes: 24 * 1024 * 1024,
  imageBytes: 2 * 1024 * 1024,
  images: 40,
  records: 4000,
  text: 12000,
};
export function assert(ok: unknown, msg: string): asserts ok {
  if (!ok) throw Error(msg);
}
const obj = (x: any) => x && typeof x === "object" && !Array.isArray(x);
const id = (x: any) => typeof x === "string" && x.length > 0 && x.length <= 100;
const str = (x: any) => typeof x === "string" && x.length <= LIMITS.text;
function strings(x: any) {
  if (typeof x === "string") assert(str(x), "Text is too long.");
  else if (Array.isArray(x)) x.forEach(strings);
  else if (obj(x)) Object.values(x).forEach(strings);
}
function optionalText(x: any, keys: string[]) {
  for (const k of keys)
    assert(x[k] === undefined || str(x[k]), `Invalid ${k}.`);
}
function itemCheck(i: any, allowEmpty = false) {
  assert(
    i?.calorieInputEmpty === undefined ||
      typeof i.calorieInputEmpty === "boolean",
    "Invalid pending calorie field.",
  );
  if (!allowEmpty)
    assert(
      !i?.calorieInputEmpty,
      "Complete or clear the pending calorie value.",
    );
  assert(
    obj(i) && str(i.name) && (allowEmpty || i.name.trim()),
    "Every item needs a name.",
  );
  assert(
    i.calorie === undefined || validCalorieValue(i.calorie),
    "Invalid calorie information.",
  );
  optionalText(i, ["description", "ingredients", "notes"]);
  assert(i.imageId === undefined || id(i.imageId), "Invalid photo ID.");
  assert(i.sourceId === undefined || id(i.sourceId), "Invalid source ID.");
}
function baseCheck(x: any) {
  assert(
    obj(x) && id(x.id) && Number.isSafeInteger(x.revision) && x.revision > 0,
    "Invalid record ID or revision.",
  );
  assert(
    typeof x.createdAt === "string" &&
      Number.isFinite(Date.parse(x.createdAt)) &&
      Number.isFinite(Date.parse(x.updatedAt)),
    "Invalid record timestamps.",
  );
}
export function validateItems(items: any): asserts items is Item[] {
  assert(
    Array.isArray(items) && items.length > 0 && items.length <= 100,
    "Add at least one item (maximum 100).",
  );
  for (const i of items) itemCheck(i);
}
export function validateMeal(m: any, interactive = false) {
  baseCheck(m);
  assert(validDate(m.date), "Invalid calendar date.");
  if (interactive)
    assert(
      m.date <= localDate(),
      "New or edited meals cannot use a future date.",
    );
  assert(categories.includes(m.category), "Choose a meal category.");
  validateItems(m.items);
  optionalText(m, ["title", "notes", "pendingText"]);
  strings(m);
}
export function estimatedBytes(d: Data) {
  const text = {
    ...d,
    images: d.images.map(({ blob, ...i }) => ({ ...i, data: "" })),
  };
  return (
    1024 +
    new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, data: text }))
      .length +
    d.images.reduce((n, i) => n + 4 * Math.ceil(i.blob.size / 3) + 100, 0)
  );
}
export function validateData(d: any): asserts d is Data {
  assert(obj(d), "Invalid backup data.");
  assert(
    Object.keys(d).every((k) =>
      [
        "foods",
        "meals",
        "workouts",
        "images",
        "drafts",
        "preferences",
        "meta",
      ].includes(k),
    ),
    "Unknown backup collections.",
  );
  for (const key of [
    "foods",
    "meals",
    "workouts",
    "images",
    "drafts",
    "preferences",
    "meta",
  ]) {
    assert(Array.isArray(d[key]), `Missing ${key}.`);
    assert(d[key].length <= LIMITS.records, "Too many records.");
    const seen = new Set();
    for (const r of d[key]) {
      assert(
        obj(r) && id(r.id) && !seen.has(r.id),
        "Invalid or duplicate record ID.",
      );
      seen.add(r.id);
    }
  }
  assert(
    d.foods.length + d.meals.length + d.workouts.length <= LIMITS.records,
    "Record capacity reached.",
  );
  assert(d.images.length <= LIMITS.images, "Photo capacity reached.");
  assert(d.drafts.length <= 1, "Only one draft is supported.");
  for (const f of d.foods) {
    baseCheck(f);
    assert(
      f.calorie === undefined || validCalorieValue(f.calorie),
      "Invalid saved-food calories.",
    );
    optionalText(f, ["description", "ingredients", "notes", "type"]);
    assert(
      str(f.name) &&
        f.name.trim() &&
        typeof f.favourite === "boolean" &&
        typeof f.archived === "boolean",
      "Invalid saved food.",
    );
    if (f.recipe !== undefined) {
      assert(
        obj(f.recipe) &&
          Array.isArray(f.recipe.items) &&
          f.recipe.items.length > 0 &&
          f.recipe.items.length <= 100 &&
          Number.isFinite(f.recipe.servings) &&
          f.recipe.servings > 0 &&
          f.recipe.servings <= 10000,
        "Invalid recipe.",
      );
      f.recipe.items.forEach((item: any) => itemCheck(item));
    }
    if (f.aliases)
      assert(
        Array.isArray(f.aliases) && f.aliases.every(str),
        "Invalid aliases.",
      );
  }
  for (const m of d.meals) validateMeal(m);
  for (const w of d.workouts)
    assert(
      validDate(w.id) &&
        ["workout", "rest"].includes(w.state) &&
        Number.isSafeInteger(w.revision) &&
        w.revision > 0,
      "Invalid workout.",
    );
  for (const dr of d.drafts) {
    baseCheck(dr);
    assert(
      dr.recipeServings === undefined ||
        (Number.isFinite(dr.recipeServings) &&
          dr.recipeServings > 0 &&
          dr.recipeServings <= 10000),
      "Invalid recipe servings.",
    );
    assert(
      dr.id === "active" &&
        id(dr.mealId) &&
        id(dr.templateId) &&
        validDate(dr.date) &&
        categories.includes(dr.category) &&
        Array.isArray(dr.items) &&
        dr.items.length <= 100 &&
        Number.isInteger(dr.expectedRevision) &&
        dr.expectedRevision >= 0 &&
        typeof dr.saveTemplate === "boolean" &&
        str(dr.dishName),
      "Invalid draft.",
    );
    dr.items.forEach((i: any) => itemCheck(i, true));
    optionalText(dr, ["title", "notes", "pendingText"]);
  }
  const images = new Set(d.images.map((i: any) => i.id));
  const foods = new Set(d.foods.map((f: any) => f.id));
  for (const i of d.images)
    assert(
      i.blob instanceof Blob &&
        i.blob.size > 0 &&
        i.blob.size <= LIMITS.imageBytes &&
        ["image/jpeg", "image/png", "image/webp"].includes(i.mime) &&
        i.blob.type === i.mime &&
        Number.isInteger(i.width) &&
        i.width > 0 &&
        i.width <= 4096 &&
        Number.isInteger(i.height) &&
        i.height > 0 &&
        i.height <= 4096,
      "Invalid or oversized photo.",
    );
  const refs = (x: any) => {
    if (!obj(x)) return;
    if (x.sourceId !== undefined)
      assert(foods.has(x.sourceId), "Missing source food reference.");
    if (x.imageId !== undefined)
      assert(images.has(x.imageId), "Missing photo reference.");
    if (x.label) {
      assert(
        obj(x.label) &&
          str(x.label.text) &&
          typeof x.label.reviewed === "boolean",
        "Invalid label reference.",
      );
      refs(x.label);
    }
    if (x.items) x.items.forEach(refs);
    if (x.recipe) x.recipe.items.forEach(refs);
  };
  [...d.foods, ...d.meals, ...d.drafts].forEach(refs);
  assert(
    d.preferences.length === 1 && d.preferences[0].id === "prefs",
    "Invalid preferences.",
  );
  const p = d.preferences[0];
  assert(
    Array.isArray(p.pins) &&
      p.pins.length <= 2 &&
      new Set(p.pins).size === p.pins.length,
    "Invalid pins.",
  );
  assert(
    p.pins.every((id: string) =>
      d.foods.some((f: any) => f.id === id && !f.archived && f.favourite),
    ),
    "Pinned food is missing or archived.",
  );
  for (const k of ["voiceMode", "scanMode"])
    assert(
      p[k] === undefined || ["manual", "automatic"].includes(p[k]),
      "Invalid input mode preference.",
    );
  for (const k of ["speechConsent", "reminderDismissed"])
    assert(
      p[k] === undefined || typeof p[k] === "boolean",
      "Invalid preference.",
    );
  assert(
    p.lastExport === undefined ||
      (typeof p.lastExport === "string" &&
        Number.isFinite(Date.parse(p.lastExport))),
    "Invalid export timestamp.",
  );
  assert(
    obj(p.lastCategory) &&
      Object.entries(p.lastCategory).every(
        ([date, cat]) => validDate(date) && categories.includes(cat as any),
      ),
    "Invalid category preferences.",
  );
  assert(
    d.meta.length === 1 &&
      d.meta[0].id === "generation" &&
      Number.isSafeInteger(d.meta[0].value) &&
      d.meta[0].value > 0,
    "Invalid generation.",
  );
  const meta = d.meta[0];
  assert(
    meta.counter === undefined ||
      (Number.isSafeInteger(meta.counter) && meta.counter >= 0),
    "Invalid write counter.",
  );
  assert(
    meta.versions === undefined ||
      (obj(meta.versions) &&
        Object.entries(meta.versions).every(
          ([k, v]) =>
            k.length <= 150 && Number.isSafeInteger(v) && (v as number) >= 0,
        )),
    "Invalid record versions.",
  );
  strings({ ...d, images: [] });
  assert(
    estimatedBytes(d) <= LIMITS.backupBytes,
    "Full backup capacity reached (24 MiB). Save without the new photo or export and remove records.",
  );
}
