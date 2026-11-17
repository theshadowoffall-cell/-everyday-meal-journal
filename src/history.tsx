import { calorieTotal } from "./calories";
import { categories, type Meal } from "./types";
import { Photo, Icon } from "./ui";
export function MealRows({
  meals,
  onClick,
  urls,
}: {
  meals: Meal[];
  onClick: (m: Meal) => void;
  urls: Record<string, string>;
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
                aria-describedby={`calories-${m.id}`}
                key={m.id}
                onClick={() => onClick(m)}
              >
                <Photo
                  url={urls[m.items.find((i) => i.imageId)?.imageId || ""]}
                  name=""
                />
                <span>
                  <strong>
                    {m.title || m.items.map((i) => i.name).join(" + ")}
                  </strong>
                  <small id={`calories-${m.id}`}>
                    {(() => {
                      const t = calorieTotal(m.items);
                      return `${Math.round(t.known)} kcal${t.complete ? "" : " · incomplete"}`;
                    })()}
                  </small>
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
