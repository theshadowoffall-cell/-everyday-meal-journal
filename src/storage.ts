import { openDB, type IDBPDatabase } from "idb";
import {
  base,
  emptyData,
  newId,
  snapshot,
  timestamp,
  type Data,
  type Draft,
  type Food,
  type Meal,
  type Preferences,
  type RecordValue,
  type Store,
} from "./types";
import { localDate } from "./dates";
import { assert, validateData, validateMeal } from "./validation";
const stores: Store[] = [
  "foods",
  "meals",
  "workouts",
  "images",
  "drafts",
  "preferences",
  "meta",
];
export type Undo = {
  store: "meals" | "foods" | "workouts";
  id: string;
  before?: any;
  after?: any;
  generation: number;
  beforePins?: string[];
  afterPins?: string[];
  version?: number;
};
export class JournalDB {
  private db: Promise<IDBPDatabase>;
  private listeners = new Set<() => void>();
  private channel?: BroadcastChannel;
  public faultForTest = false;
  constructor(
    name = "everyday-journal-v1",
    public onIssue = (s: string) => {
      window.dispatchEvent(new CustomEvent("storage-issue", { detail: s }));
    },
  ) {
    this.db = openDB(name, 1, {
      upgrade(db) {
        stores.forEach((s) => db.createObjectStore(s, { keyPath: "id" }));
      },
      blocked: () =>
        onIssue(
          "Database upgrade blocked. Close other journal tabs, then reload. Your records are unchanged.",
        ),
      blocking: () => {
        this.db.then((db) => db.close());
        onIssue("Another tab needs a database upgrade. Reload this tab.");
      },
      terminated: () =>
        onIssue(
          "Storage connection closed. Reload to reconnect; your input is retained.",
        ),
    });
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(name);
      this.channel.onmessage = () => this.emit(false);
    }
  }
  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit(broadcast = true) {
    this.listeners.forEach((fn) => fn());
    if (broadcast) this.channel?.postMessage("changed");
  }
  async read(): Promise<Data> {
    const db = await this.db;
    const tx = db.transaction(stores, "readonly");
    const d = emptyData();
    await Promise.all(
      stores.map(async (s) => {
        const rows = await tx.objectStore(s).getAll();
        if (rows.length || (s !== "preferences" && s !== "meta"))
          (d[s] as any) = rows;
      }),
    );
    await tx.done;
    return d;
  }
  async mutate(generation: number, change: (d: Data) => void) {
    const db = await this.db;
    const tx = db.transaction(stores, "readwrite");
    try {
      const d = emptyData();
      for (const s of stores) {
        const rows = await tx.objectStore(s).getAll();
        if (rows.length || (s !== "preferences" && s !== "meta"))
          (d[s] as any) = rows;
      }
      assert(
        d.meta[0].value === generation,
        "Data was restored in another tab. Reload before saving. Your draft is retained here.",
      );
      const prior = new Map<string, string>();
      for (const store of ["meals", "foods", "workouts"] as const)
        for (const row of d[store])
          prior.set(`${store}:${row.id}`, JSON.stringify(row));
      change(d);
      const meta = d.meta[0];
      meta.counter = (meta.counter || 0) + 1;
      meta.versions = { ...meta.versions };
      for (const store of ["meals", "foods", "workouts"] as const) {
        const ids = new Set([
          ...d[store].map((r) => r.id),
          ...[...prior.keys()]
            .filter((k) => k.startsWith(store + ":"))
            .map((k) => k.slice(store.length + 1)),
        ]);
        for (const id of ids) {
          const key = `${store}:${id}`;
          const now = d[store].find((r) => r.id === id);
          if (prior.get(key) !== JSON.stringify(now))
            meta.versions[key] = meta.counter;
        }
      }
      validateData(d);
      if (this.faultForTest)
        throw Error("Simulated storage failure. Input retained.");
      for (const s of stores) {
        await tx.objectStore(s).clear();
        for (const row of d[s]) await tx.objectStore(s).put(row);
      }
      await tx.done;
      this.emit();
      return d;
    } catch (e) {
      try {
        tx.abort();
      } catch {}
      await tx.done.catch(() => {});
      throw e;
    }
  }
  async writeDraft(
    next: Draft | undefined,
    expected: number,
    generation: number,
  ) {
    return this.mutate(generation, (d) => {
      const current = d.drafts[0];
      assert(
        (current?.revision || 0) === expected,
        "This draft changed in another tab. Reload to review it.",
      );
      if (
        next &&
        current &&
        next.date === current.date &&
        next.category !== current.category
      )
        d.preferences[0].lastCategory[next.date] = next.category;
      d.drafts = next ? [next] : [];
    });
  }
  async saveMeal(dr: Draft, generation: number) {
    let undo: Undo | undefined;
    await this.mutate(generation, (d) => {
      const existing = d.meals.find((m) => m.id === dr.mealId);
      if (dr.expectedRevision === 0 && existing) return;
      assert(
        (existing?.revision || 0) === dr.expectedRevision,
        "This meal changed in another tab. Close and reload it; your draft is retained.",
      );
      assert(
        d.drafts[0]?.mealId === dr.mealId &&
          d.drafts[0].revision === dr.revision,
        "Draft changed. Reload to review before saving.",
      );
      const {
        mealId,
        expectedRevision,
        saveTemplate,
        dishName,
        templateId,
        pendingText,
        ...rest
      } = dr;
      const meal: Meal = {
        ...rest,
        id: mealId,
        revision: (existing?.revision || 0) + 1,
        updatedAt: timestamp(),
      };
      validateMeal(meal, true);
      d.meals = d.meals.filter((m) => m.id !== meal.id).concat(meal);
      if (saveTemplate) {
        assert(dishName.trim(), "Enter a name for the saved dish.");
        const f: Food = {
          ...base(templateId),
          name: dishName.trim(),
          description: dr.items.map((i) => i.name).join(" + "),
          ingredients: dr.items.map((i) => i.ingredients || i.name).join("\n"),
          notes: dr.notes,
          favourite: false,
          archived: false,
        };
        d.foods.push(f);
      }
      d.preferences[0].lastCategory[meal.date] = meal.category;
      d.drafts = [];
      undo = {
        store: "meals",
        id: meal.id,
        before: existing,
        after: meal,
        generation,
        version: (d.meta[0].counter || 0) + 1,
      };
    });
    return undo;
  }
  async putRecord(
    store: Undo["store"],
    record: any,
    expected: number,
    generation: number,
  ): Promise<Undo> {
    let undo!: Undo;
    await this.mutate(generation, (d) => {
      const list = d[store] as any[];
      const old = list.find((x) => x.id === record.id);
      assert(
        (old?.revision || 0) === expected,
        "This record changed in another tab. Reload it before editing.",
      );
      if (store === "workouts")
        assert(record.id <= localDate(), "Cannot log a future workout.");
      if (store === "meals") validateMeal(record, true);
      const next = {
        ...record,
        revision: expected + 1,
        ...(store === "workouts" ? {} : { updatedAt: timestamp() }),
      };
      (d[store] as any) = list.filter((x) => x.id !== record.id).concat(next);
      undo = {
        store,
        id: record.id,
        before: old,
        after: next,
        generation,
        version: (d.meta[0].counter || 0) + 1,
      };
    });
    return undo;
  }
  async remove(
    store: Undo["store"],
    id: string,
    revision: number,
    generation: number,
  ): Promise<Undo> {
    let undo!: Undo;
    await this.mutate(generation, (d) => {
      const list = d[store] as any[];
      const old = list.find((x) => x.id === id);
      assert(
        old && old.revision === revision,
        "This record changed. Reload before deleting.",
      );
      (d[store] as any) = list.filter((x) => x.id !== id);
      if (store === "foods")
        d.preferences[0].pins = d.preferences[0].pins.filter((x) => x !== id);
      undo = {
        store,
        id,
        before: old,
        generation,
        version: (d.meta[0].counter || 0) + 1,
      };
    });
    return undo;
  }
  async undo(u: Undo) {
    await this.mutate(u.generation, (d) => {
      if (u.version !== undefined)
        assert(
          d.meta[0].versions?.[`${u.store}:${u.id}`] === u.version,
          "Undo is unavailable because this record changed since that action.",
        );
      const list = d[u.store] as any[];
      const now = list.find((x) => x.id === u.id);
      if (u.afterPins)
        assert(
          JSON.stringify(d.preferences[0].pins) === JSON.stringify(u.afterPins),
          "Undo is unavailable because pin choices changed.",
        );
      assert(
        JSON.stringify(now) === JSON.stringify(u.after),
        "Undo is unavailable because this record changed. Newer data is preserved.",
      );
      if (u.beforePins) d.preferences[0].pins = [...u.beforePins];
      (d[u.store] as any) = list.filter((x) => x.id !== u.id);
      if (u.before)
        (d[u.store] as any).push({
          ...u.before,
          revision: (u.after?.revision || u.before.revision) + 1,
        });
    });
  }
  async prefs(change: (p: Preferences) => void, generation: number) {
    await this.mutate(generation, (d) => change(d.preferences[0]));
  }
  async restore(incoming: Data, generation: number) {
    validateData(incoming);
    await this.mutate(generation, (d) => {
      const next = structuredClone(incoming);
      next.meta = [{ id: "generation", value: generation + 1 }];
      Object.assign(d, next);
    });
  }
  async close() {
    (await this.db).close();
    this.channel?.close();
  }
}
export function createDraft(
  data: Data,
  date: string,
  items: Meal["items"] = [],
  meal?: Meal,
): Draft {
  return {
    ...(meal || base()),
    id: "active",
    revision: 1,
    mealId: meal?.id || newId(),
    expectedRevision: meal?.revision || 0,
    date,
    category:
      meal?.category ||
      data.preferences[0].lastCategory[date] ||
      "Uncategorised",
    items: structuredClone(meal?.items || items),
    title: meal?.title || "",
    notes: meal?.notes || "",
    saveTemplate: false,
    dishName: "",
    templateId: newId(),
  };
}
export function fromFood(f: Food) {
  return snapshot(f);
}
