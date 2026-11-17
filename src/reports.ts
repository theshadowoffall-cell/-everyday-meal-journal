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
