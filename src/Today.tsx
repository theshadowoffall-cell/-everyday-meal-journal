import { itemCalories } from "./calories";
import { useEffect, useRef } from "react";
import type { Data, Food, Meal } from "./types";
import { dateLabel, localDate, week } from "./dates";
import { Empty, Icon, Photo } from "./ui";
import { MealRows } from "./history";
export function Today({
  data,
  date,
  setDate,
  add,
  details,
  editMeal,
  workout,
  dayDetails,
  library,
  urls,
}: {
  data: Data;
  date: string;
  setDate: (s: string) => void;
  add: (f?: Food) => void;
  details: (f: Food) => void;
  editMeal: (m: Meal) => void;
  workout: () => void;
  dayDetails: () => void;
  library: () => void;
  urls: Record<string, string>;
}) {
  const days = week(date),
    today = localDate(),
    isToday = date === today,
    w = data.workouts.find((w) => w.id === date);
  const selected = useRef<HTMLButtonElement>(null);
  useEffect(
    () =>
      selected.current?.scrollIntoView?.({
        block: "nearest",
        inline: "center",
      }),
    [date],
  );
  const pinned = data.preferences[0].pins
    .map((id) => data.foods.find((f) => f.id === id))
    .filter((f): f is Food => !!f && !f.archived);
  const favouriteIds = new Set(pinned.map((f) => f.id));
  const favourites = [
    ...pinned,
    ...data.foods
      .filter((f) => f.favourite && !f.archived && !favouriteIds.has(f.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];
  return (
    <>
      <section className="week-section">
        <div className="section-heading">
          <h2>This week</h2>
          <span className="muted">
            {dateLabel(days[0], { month: "short", day: "numeric" })} –{" "}
            {dateLabel(days[6], { month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="week-strip" role="group" aria-label="Select a day">
          {days.map((d) => {
            const status = data.workouts.find((w) => w.id === d)?.state;
            return (
              <button
                key={d}
                ref={d === date ? selected : undefined}
                className={`day ${d === date ? "selected" : ""}`}
                aria-pressed={d === date}
                aria-label={`${dateLabel(d)}, ${status || "unlogged"}`}
                disabled={d > today}
                onClick={() => setDate(d)}
              >
                <span>{dateLabel(d, { weekday: "narrow" })}</span>
                <strong>{Number(d.slice(-2))}</strong>
                <span className={`status ${status || ""}`}>
                  {status === "workout" ? (
                    <Icon name="check" />
                  ) : status === "rest" ? (
                    "R"
                  ) : (
                    ""
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <button
          className={`workout-action ${w ? "logged" : ""}`}
          onClick={workout}
        >
          <span>
            {w?.state === "workout" ? (
              <Icon name="check" />
            ) : (
              <Icon name="plus" />
            )}
            {w?.state === "workout"
              ? "Workout logged"
              : w?.state === "rest"
                ? "Change to workout"
                : "Log workout"}
          </span>
          <span>
            {w?.state === "workout"
              ? "Edit status"
              : isToday
                ? "Today"
                : dateLabel(date, { month: "short", day: "numeric" })}
          </span>
        </button>
        <button className="text-button" onClick={dayDetails}>
          Day details
        </button>
        {!isToday && (
          <button className="text-button" onClick={() => setDate(today)}>
            Back to today
          </button>
        )}
      </section>
      <section>
        <div className="section-heading">
          <h2>Your favourites</h2>
          <button className="text-button" onClick={library}>
            View all <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="favourites">
          {favourites.map((f) => (
            <div className="favourite" key={f.id}>
              <button className="tile-details" onClick={() => details(f)}>
                <Photo url={urls[f.imageId || ""]} name={f.name} />
                <strong>{f.name}</strong>
                {itemCalories(f.calorie) !== undefined && (
                  <small>{Math.round(itemCalories(f.calorie)!)} kcal</small>
                )}
              </button>
              <button
                className="square"
                aria-label={`Add ${f.name}`}
                onClick={() => add(f)}
              >
                <Icon name="plus" />
              </button>
            </div>
          ))}
        </div>
        {favourites.length === 0 && (
          <button className="pin-empty" onClick={library}>
            <Icon name="plus" /> Add a favourite
          </button>
        )}
      </section>
      <section>
        <div className="section-heading">
          <h2>{isToday ? "Logged today" : "Logged this day"}</h2>
          <span className="muted">
            {data.meals.filter((m) => m.date === date).length} entries
          </span>
        </div>
        <MealRows
          meals={data.meals.filter((m) => m.date === date)}
          onClick={editMeal}
          urls={urls}
          showCalories={true}
        />
        {!data.meals.some((m) => m.date === date) && (
          <Empty>
            No meals recorded yet.
            <br />A name is enough to get started.
          </Empty>
        )}
      </section>
    </>
  );
}
