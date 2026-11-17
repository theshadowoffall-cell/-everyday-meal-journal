import { calorieTotal } from "./calories";
import type { Data } from "./types";
import { addDays, localDate, week } from "./dates";
export function report(
  data: Data,
  start: string,
  end: string,
  today = localDate(),
) {
  const inside = (s: string) => s >= start && s <= end && s <= today;
  return {
    workouts: new Set(
      data.workouts
        .filter((x) => x.state === "workout" && inside(x.id))
        .map((x) => x.id),
    ).size,
    mealDays: new Set(
      data.meals.filter((x) => inside(x.date)).map((x) => x.date),
    ).size,
  };
}
export function completedWeeks(data: Data, today = localDate()) {
  const start = week(today)[0];
  const last = [addDays(start, -7), addDays(start, -1)],
    prior = [addDays(start, -14), addDays(start, -8)];
  return {
    last,
    prior,
    lastCounts: report(data, last[0], last[1], today),
    priorCounts: report(data, prior[0], prior[1], today),
  };
}

export type CalorieGoal = {
  from: string;
  target: number;
  direction: "at_or_below" | "at_or_above";
};
export function calorieDay(data: Data, date: string) {
  const meals = data.meals.filter((m) => m.date === date);
  if (!meals.length)
    return { known: 0, unknown: 0, complete: false, hasMeals: false };
  return { ...calorieTotal(meals.flatMap((m) => m.items)), hasMeals: true };
}
export function calorieAverage(
  data: Data,
  start: string,
  end: string,
  today = localDate(),
) {
  const dates = [
    ...new Set(
      data.meals
        .map((m) => m.date)
        .filter((d) => d >= start && d <= end && d <= today),
    ),
  ];
  const days = dates.map((d) => calorieDay(data, d));
  const complete = days.filter((d) => d.complete);
  return {
    average: complete.length
      ? complete.reduce((n, d) => n + d.known, 0) / complete.length
      : undefined,
    days: complete.length,
    excluded: days.length - complete.length,
  };
}
export function goalStatus(
  data: Data,
  date: string,
  goals: CalorieGoal[],
  today = localDate(),
) {
  if (date > today) return undefined;
  const goal = [...goals]
    .filter((g) => g.from <= date)
    .sort((a, b) => b.from.localeCompare(a.from))[0];
  const day = calorieDay(data, date);
  if (!goal || !day.hasMeals || !day.complete) return undefined;
  return goal.direction === "at_or_below"
    ? day.known <= goal.target
    : day.known >= goal.target;
}
