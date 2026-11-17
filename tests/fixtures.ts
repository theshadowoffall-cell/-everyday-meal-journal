import { base, emptyData, snapshot, type Data, type Food } from "../src/types";
import { setClockForTest } from "../src/dates";
export const freeze = () =>
  setClockForTest(() => new Date("2026-11-15T17:00:00Z"));
export const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7r0AAAAASUVORK5CYII=";
export function fixture(): Data {
  const d = emptyData();
  const names = [
    "Chicken & rice",
    "Yogurt & berries",
    "Eggs on toast",
    "Plain yogurt",
    "Apple",
    "Vegetable soup",
  ];
  d.foods = names.map(
    (name, i): Food => ({
      ...base(`food-${i}`),
      name,
      aliases: i === 0 ? ["Chicken and rice"] : [],
      ingredients: i === 0 ? "Chicken\nRice\nBroccoli" : undefined,
      notes: i === 0 ? "My usual homemade lunch" : undefined,
      favourite: i < 2,
      archived: false,
    }),
  );
  d.preferences[0].pins = ["food-0", "food-1"];
  d.workouts = [9, 11, 14]
    .map((n) => ({
      id: `2026-11-${n.toString().padStart(2, "0")}`,
      revision: 1,
      state: "workout" as const,
    }))
    .concat(
      [10, 13].map((n) => ({
        id: `2026-11-${n}`,
        revision: 1,
        state: "rest" as any,
      })),
    );
  d.meals = [
    {
      ...base("meal-breakfast"),
      date: "2026-11-15",
      category: "Breakfast",
      items: [snapshot(d.foods[2])],
    },
  ];
  return d;
}
export function restoreFixture(): Data {
  const d = fixture();
  d.foods.push({
    ...base("food-6"),
    name: "Test food",
    favourite: false,
    archived: false,
  });
  d.images = Array.from({ length: 4 }, (_, i) => ({
    id: `image-${i}`,
    blob: new Blob([Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0))], {
      type: "image/png",
    }),
    mime: "image/png",
    width: 1,
    height: 1,
  }));
  d.images.forEach((image, i) => {
    d.foods[i].imageId = image.id;
  });
  d.meals = [];
  for (let n = 1; n <= 14; n++) {
    const make = (suffix: string) => ({
      ...base(`restore-${n}-${suffix}`),
      date: `2026-11-${String(n).padStart(2, "0")}`,
      category: "Lunch" as const,
      items: [snapshot(d.foods[n % 7]), snapshot(d.foods[4])],
    });
    d.meals.push(make("a"));
    if (n <= 10) d.meals.push(make("b"));
  }
  return d;
}
