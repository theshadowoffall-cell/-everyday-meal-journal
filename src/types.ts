import type { CalorieValue } from "./calories";
import { clock } from "./dates";
export const categories = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Uncategorised",
] as const;
export type Category = (typeof categories)[number];
export type Base = {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type Label = { text: string; reviewed: boolean; imageId?: string };
export type Food = Base & {
  name: string;
  calorie?: CalorieValue;
  recipe?: { items: Item[]; servings: number };
  aliases?: string[];
  type?: string;
  description?: string;
  ingredients?: string;
  notes?: string;
  imageId?: string;
  label?: Label;
  favourite: boolean;
  archived: boolean;
};
export type Item = {
  name: string;
  calorie?: CalorieValue;
  calorieInputEmpty?: boolean;
  sourceId?: string;
  description?: string;
  ingredients?: string;
  notes?: string;
  imageId?: string;
  label?: Label;
};
export type Meal = Base & {
  date: string;
  category: Category;
  items: Item[];
  title?: string;
  notes?: string;
};
export type Workout = {
  id: string;
  revision: number;
  state: "workout" | "rest";
};
export type ImageAsset = {
  id: string;
  blob: Blob;
  mime: string;
  width: number;
  height: number;
};
export type Draft = Meal & {
  id: "active";
  mealId: string;
  expectedRevision: number;
  saveTemplate: boolean;
  dishName: string;
  templateId: string;
  recipeServings?: number;
  pendingText?: string;
};
export type Preferences = {
  id: "prefs";
  pins: string[];
  lastCategory: Record<string, Category>;
  lastExport?: string;
  reminderDismissed?: boolean;
  speechConsent?: boolean;
  voiceMode?: "manual" | "automatic";
  scanMode?: "manual" | "automatic";
};
export type Meta = {
  id: "generation";
  value: number;
  counter?: number;
  versions?: Record<string, number>;
};
export type Data = {
  foods: Food[];
  meals: Meal[];
  workouts: Workout[];
  images: ImageAsset[];
  drafts: Draft[];
  preferences: Preferences[];
  meta: Meta[];
};
export type Store = keyof Data;
export type RecordValue = Data[Store][number];
export const newId = () => crypto.randomUUID();
export const timestamp = () => clock().toISOString();
export const base = (id: string = newId()): Base => ({
  id,
  revision: 1,
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
export function snapshot(f: Food): Item {
  const { name, description, ingredients, notes, imageId, label, calorie } = f;
  return structuredClone({
    name,
    description,
    ingredients,
    notes,
    imageId,
    label,
    calorie,
    sourceId: f.id,
  });
}
export const emptyData = (): Data => ({
  foods: [],
  meals: [],
  workouts: [],
  images: [],
  drafts: [],
  preferences: [{ id: "prefs", pins: [], lastCategory: {} }],
  meta: [{ id: "generation", value: 1 }],
});
