import { calorieTotal, itemCalories } from "./calories";
import { categories, type Meal } from "./types";
import { Photo, Icon } from "./ui";
export function MealRows({
  meals,
  onClick,
  urls,
  showCalories = true,
}: {
  meals: Meal[];
  onClick: (m: Meal) => void;
  urls: Record<string, string>;
  showCalories?: boolean;
}) {
  return (
    <>
      {categories.map((cat) => {
        const rows = meals.filter((m) => m.category === cat);
        return rows.length ? (
          <div className="meal-group" key={cat}>
            <h3>{cat}</h3>
            {rows.map((m) => (
              <button
                className="meal-row"
                aria-label={
                  m.title
                    ? `${m.title} ${m.items.map((i) => i.name).join(" + ")}`
                    : m.items.map((i) => i.name).join(" + ")
                }
                aria-describedby={showCalories ? `calories-${m.id}` : undefined}
                key={m.id}
                onClick={() => onClick(m)}
              >
                <Photo
                  url={urls[m.items.find((i) => i.imageId)?.imageId || ""]}
                  name=""
                />
                <span>
                  <span className="meal-name-calories">
                    <strong>
                      {m.title || m.items.map((i) => i.name).join(" + ")}
                    </strong>
                    {showCalories && (
                      <small id={`calories-${m.id}`}>
                        {(() => {
                          const t = calorieTotal(m.items);
                          return m.items.every(
                            (i) => itemCalories(i.calorie) === undefined,
                          )
                            ? "Calories unknown"
                            : `${Math.round(t.known)} kcal${t.complete ? "" : " · incomplete"}`;
                        })()}
                      </small>
                    )}
                  </span>
                  {(m.title || m.notes) && (
                    <small>
                      {m.title
                        ? m.items.map((i) => i.name).join(" + ")
                        : m.notes}
                    </small>
                  )}
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        ) : null;
      })}
    </>
  );
}
