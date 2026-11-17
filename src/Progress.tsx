import { calorieTotal } from "./calories";
import { useState } from "react";
import {
  addDays,
  dateLabel,
  localDate,
  monthCells,
  shiftMonth,
  week,
} from "./dates";
import {
  calorieAverage,
  calorieDay,
  goalStatus,
  completedWeeks,
  report,
} from "./reports";
import type { Data, Meal } from "./types";
import { MealRows } from "./history";
import { Empty, Icon } from "./ui";
export function Progress({
  data,
  editMeal,
  urls,
  openDate,
  saveGoal,
}: {
  data: Data;
  editMeal: (m: Meal) => void;
  urls: Record<string, string>;
  openDate: (s: string) => void;
  saveGoal: (
    target: number,
    direction: "at_or_below" | "at_or_above",
  ) => Promise<void>;
}) {
  const today = localDate();
  const existingGoal = [...(data.preferences[0].calorieGoals || [])]
    .filter((g) => g.from <= today)
    .sort((a, b) => b.from.localeCompare(a.from))[0];
  const [goalText, setGoalText] = useState(
    existingGoal ? String(existingGoal.target) : "",
  );
  const [direction, setDirection] = useState<"at_or_below" | "at_or_above">(
    existingGoal?.direction || "at_or_below",
  );
  const [goalMessage, setGoalMessage] = useState("");
  const todayCalories = calorieDay(data, today);
  const lastStart = addDays(week(today)[0], -7),
    lastEnd = addDays(week(today)[0], -1);
  const lastAvg = calorieAverage(data, lastStart, lastEnd, today);
  const monthStart = today.slice(0, 7) + "-01";
  const monthAvg = calorieAverage(data, monthStart, today, today);
  const averageText = (x: ReturnType<typeof calorieAverage>) =>
    x.average === undefined
      ? `No complete days${x.excluded ? ` · ${x.excluded} incomplete excluded` : ""}`
      : `${Math.round(x.average)} kcal/day · ${x.days} days${x.excluded ? ` · ${x.excluded} incomplete excluded` : ""}`;
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | undefined>(today);
  const cells = monthCells(month);
  const days = week(today);
  const counts = report(data, days[0], days[6]);
  const comparison = completedWeeks(data);
  const meals = data.meals.filter((m) =>
    selected ? m.date === selected : m.date.startsWith(month),
  );
  const dates = [...new Set(meals.map((m) => m.date))].sort().reverse();
  function change(n: number) {
    setMonth(shiftMonth(month, n));
    setSelected(undefined);
  }
  return (
    <>
      <section>
        <h2>Calories</h2>
        <p>
          Today:{" "}
          {todayCalories.hasMeals
            ? `${Math.round(todayCalories.known)} kcal${todayCalories.complete ? "" : " · incomplete"}`
            : "No meals recorded"}
        </p>
        <p>
          Last week ({lastStart} to {lastEnd}): {averageText(lastAvg)}
        </p>
        <p>
          This month ({monthStart} to {today}): {averageText(monthAvg)}
        </p>
        <p className="muted">
          Averages include only recorded days with complete calorie information.
          Goal markers use logged meals; days with unknown calories have no goal
          result.
        </p>
        <label>
          Daily calorie goal
          <input
            type="number"
            min="1"
            max="100000"
            step="1"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
          />
        </label>
        <label>
          Goal is met when calories are
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as typeof direction)}
          >
            <option value="at_or_below">At or below goal</option>
            <option value="at_or_above">At or above goal</option>
          </select>
        </label>
        <button
          disabled={
            !Number.isFinite(Number(goalText)) ||
            Number(goalText) <= 0 ||
            Number(goalText) > 100000
          }
          onClick={() =>
            void saveGoal(Number(goalText), direction)
              .then(() => setGoalMessage("Goal saved from today."))
              .catch((e) => setGoalMessage(e.message))
          }
        >
          Save goal
        </button>
        <p role="status">{goalMessage}</p>
      </section>
      <section>
        <div className="section-heading">
          <button aria-label="Previous month" onClick={() => change(-1)}>
            ‹
          </button>
          <h2>
            {dateLabel(month + "-01", { month: "long", year: "numeric" })}
          </h2>
          <button aria-label="Next month" onClick={() => change(1)}>
            ›
          </button>
        </div>
        <div className="calendar">
          <div className="calendar-labels">
            {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {cells.map((d, i) =>
              d ? (
                <button
                  key={d}
                  className={`calendar-day ${selected === d ? "selected" : ""}`}
                  aria-pressed={selected === d}
                  aria-label={`${dateLabel(d)}, ${data.workouts.find((w) => w.id === d)?.state || "unlogged"}${data.meals.some((m) => m.date === d) ? ", has meals" : ""}${d > today ? ", future imported history" : ""}${goalStatus(data, d, data.preferences[0].calorieGoals || [], today) === true ? ", calorie goal met" : goalStatus(data, d, data.preferences[0].calorieGoals || [], today) === false ? ", calorie goal not met" : ""}`}
                  onClick={() => setSelected(selected === d ? undefined : d)}
                >
                  <strong>{Number(d.slice(-2))}</strong>
                  <span
                    className={`status ${data.workouts.find((w) => w.id === d)?.state || ""}`}
                  >
                    {data.workouts.find((w) => w.id === d)?.state === "rest" ? (
                      "R"
                    ) : data.workouts.find((w) => w.id === d)?.state ===
                      "workout" ? (
                      <Icon name="check" />
                    ) : (
                      ""
                    )}
                  </span>
                  {goalStatus(
                    data,
                    d,
                    data.preferences[0].calorieGoals || [],
                    today,
                  ) !== undefined ? (
                    <span
                      className={`goal-dot ${goalStatus(data, d, data.preferences[0].calorieGoals || [], today) ? "met" : "unmet"}`}
                      aria-hidden="true"
                    />
                  ) : (
                    data.meals.some((m) => m.date === d) && (
                      <span className="meal-dot" />
                    )
                  )}
                </button>
              ) : (
                <span key={`blank${i}`} />
              ),
            )}
          </div>
        </div>
        <p className="legend">
          <span>
            <i className="key workout" /> Workout
          </span>
          <span>
            <i className="key rest">R</i> Rest
          </span>
          <span>
            <i className="key" /> Unlogged
          </span>
          <span>
            <i className="goal-dot met" /> Goal met
          </span>
          <span>
            <i className="goal-dot unmet" /> Goal not met
          </span>
          <span>
            <i className="meal-dot" /> Meals, no goal result
          </span>
        </p>
        {selected && selected <= today && (
          <button className="text-button" onClick={() => openDate(selected)}>
            Open {dateLabel(selected, { month: "short", day: "numeric" })} in
            Today →
          </button>
        )}
      </section>
      <section className="week-summary">
        <h2>This week so far</h2>
        <p className="muted">
          {dateLabel(days[0], { month: "short", day: "numeric" })} –{" "}
          {dateLabel(today, { month: "short", day: "numeric" })}
        </p>
        <div className="stats">
          <p>
            <strong>{counts.workouts}</strong> workout days
          </p>
          <p>
            <strong>{counts.mealDays}</strong> days with meals
          </p>
        </div>
        <details>
          <summary>Completed weeks</summary>
          <p>
            {comparison.last.join(" to ")}: {comparison.lastCounts.workouts}{" "}
            workout days, {comparison.lastCounts.mealDays} days with meals.
          </p>
          <p>
            {comparison.prior.join(" to ")}: {comparison.priorCounts.workouts}{" "}
            workout days, {comparison.priorCounts.mealDays} days with meals.
          </p>
        </details>
      </section>
      <section>
        <h2>
          {selected
            ? dateLabel(selected, { month: "long", day: "numeric" })
            : "Meal history"}
        </h2>
        {selected &&
          meals.length > 0 &&
          (() => {
            const total = calorieTotal(meals.flatMap((m) => m.items));
            return (
              <p>
                Calories: {Math.round(total.known)} kcal
                {total.complete
                  ? ""
                  : ` · incomplete (${total.unknown} unknown)`}
              </p>
            );
          })()}
        {selected && selected > today && (
          <p>Imported future history. Excluded from elapsed-period totals.</p>
        )}
        {!meals.length ? (
          <Empty>No records yet.</Empty>
        ) : (
          dates.map((d) => (
            <div key={d}>
              {!selected && <h3>{dateLabel(d)}</h3>}
              <MealRows
                meals={meals.filter((m) => m.date === d)}
                onClick={editMeal}
                urls={urls}
              />
            </div>
          ))
        )}
      </section>
    </>
  );
}
