import { calorieTotal } from "./calories";
import { useState } from "react";
import { dateLabel, localDate, monthCells, shiftMonth, week } from "./dates";
import { completedWeeks, report } from "./reports";
import type { Data, Meal } from "./types";
import { MealRows } from "./history";
import { Empty, Icon } from "./ui";
export function Progress({
  data,
  editMeal,
  urls,
  openDate,
}: {
  data: Data;
  editMeal: (m: Meal) => void;
  urls: Record<string, string>;
  openDate: (s: string) => void;
}) {
  const today = localDate();
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
                  aria-label={`${dateLabel(d)}, ${data.workouts.find((w) => w.id === d)?.state || "unlogged"}${data.meals.some((m) => m.date === d) ? ", has meals" : ""}${d > today ? ", future imported history" : ""}`}
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
                  {data.meals.some((m) => m.date === d) && (
                    <span className="meal-dot" />
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
            <i className="meal-dot" /> Meals
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
