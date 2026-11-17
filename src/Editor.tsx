import {
  searchCatalog,
  searchFoods,
  identifyFood,
  sourceText,
  catalogServing,
} from "./catalog";
import { snapshot } from "./types";
import { itemCalories } from "./calories";
import { useState } from "react";
import {
  categories,
  type Data,
  type Draft,
  type Food,
  type Item,
} from "./types";
import { localDate } from "./dates";
import { Icon, Modal } from "./ui";
export function Editor({
  draft,
  data,
  change,
  save,
  close,
  discard,
  voice,
  scan,
  pending,
  error,
  details,
}: {
  draft: Draft;
  data: Data;
  change: (d: Draft) => void;
  save: () => void;
  close: () => void;
  discard: () => void;
  voice: () => void;
  scan: () => void;
  pending: boolean;
  error: string;
  details: (f: Food) => void;
}) {
  const text = draft.pendingText || "";
  const setText = (value: string) => change({ ...draft, pendingText: value });
  const [query, setQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const add = (i: Item) => change({ ...draft, items: [...draft.items, i] });
  const hasText = !!text.trim();
  function addText() {
    if (hasText)
      change({
        ...draft,
        items: [...draft.items, { name: text.trim() }],
        pendingText: "",
      });
  }
  return (
    <Modal
      title={draft.expectedRevision ? "Edit meal" : "Add meal"}
      onClose={close}
      footer={
        <button
          className="primary full"
          disabled={
            pending ||
            (!draft.items.length && !hasText) ||
            draft.items.some((i) => i.calorieInputEmpty)
          }
          onClick={() => {
            if (hasText) {
              change({
                ...draft,
                items: [...draft.items, { name: text.trim() }],
                pendingText: "",
              });
            }
            save();
          }}
        >
          {pending ? "Saving…" : "Save meal"}
        </button>
      }
    >
      <div className="two-fields">
        <label>
          Date
          <input
            type="date"
            value={draft.date}
            max={localDate()}
            onChange={(e) =>
              change({
                ...draft,
                date: e.target.value,
                category:
                  data.preferences[0].lastCategory[e.target.value] ||
                  "Uncategorised",
              })
            }
          />
        </label>
        <label>
          Category
          <select
            value={draft.category}
            onChange={(e) =>
              change({
                ...draft,
                category: e.target.value as Draft["category"],
              })
            }
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <h3>In this meal</h3>
      {!draft.items.length && (
        <p className="muted">Choose a saved food or write a name below.</p>
      )}
      {draft.items.map((i, index) => (
        <div className="draft-item" key={index}>
          <label className="grow">
            <span className="sr-only">Item {index + 1}</span>
            <input
              value={i.name}
              onChange={(e) =>
                change({
                  ...draft,
                  items: draft.items.map((item, n) =>
                    n === index ? { ...item, name: e.target.value } : item,
                  ),
                })
              }
            />
          </label>
          <button
            className="icon-button"
            aria-label={`Remove ${i.name}`}
            onClick={() =>
              change({
                ...draft,
                items: draft.items.filter((_, n) => n !== index),
              })
            }
          >
            <Icon name="close" />
          </button>
        </div>
      ))}
      {draft.items.map((item, index) => (
        <fieldset key={`calorie-${index}`}>
          <legend>Calories for {item.name || `item ${index + 1}`}</legend>
          {item.label && (
            <details open={!item.label.reviewed}>
              <summary>
                Scanned label{" "}
                {item.label.reviewed ? "(reviewed)" : "(unreviewed)"}
              </summary>
              <p className="preserve">{item.label.text || "Photo only"}</p>
            </details>
          )}
          <p className="muted">
            Optional. Enter a value from your food label; leave blank if
            unknown.
          </p>
          <label>
            Calories per serving
            <input
              type="number"
              min="0"
              step="any"
              value={
                item.calorieInputEmpty ? "" : (item.calorie?.calories ?? "")
              }
              onChange={(e) => {
                const value = e.target.value;
                change({
                  ...draft,
                  items: draft.items.map((x, n) =>
                    n !== index
                      ? x
                      : {
                          ...x,
                          calorieInputEmpty:
                            value === "" && !!x.calorie ? true : undefined,
                          calorie:
                            value === ""
                              ? x.calorie
                              : {
                                  calories: Number(value),
                                  basisQuantity: x.calorie?.basisQuantity || 1,
                                  unit: x.calorie?.unit || "serving",
                                  quantity: x.calorie?.quantity || 1,
                                  source: "User entered",
                                },
                        },
                  ),
                });
              }}
            />
          </label>
          {item.calorieInputEmpty && (
            <p className="error">
              Enter a calorie value, or clear the calorie information.
            </p>
          )}
          {item.calorie && (
            <>
              <button
                type="button"
                onClick={() =>
                  change({
                    ...draft,
                    items: draft.items.map((x, n) =>
                      n === index
                        ? {
                            ...x,
                            calorie: undefined,
                            calorieInputEmpty: undefined,
                          }
                        : x,
                    ),
                  })
                }
              >
                Clear calorie information
              </button>
              {(() => {
                const identified =
                  item.calorie && identifyFood(item.calorie.source);
                const food = identified?.food;
                const database = identified?.source;
                const citation =
                  food && database
                    ? sourceText(database, food.id, food.updated)
                    : "";
                return food?.portions?.length ? (
                  <label>
                    {database === "canada" ? "Canadian" : "USDA"} portion
                    <select
                      value={
                        item.calorie?.unit === "g"
                          ? "grams"
                          : item.calorie?.unit
                      }
                      onChange={(e) => {
                        const choice = e.target.value;
                        const portion = food.portions?.find(
                          (p) => p.label === choice,
                        );
                        const cal = portion
                          ? {
                              calories: (food.kcal * portion.grams) / 100,
                              basisQuantity: 1,
                              quantity: 1,
                              unit: portion.label,
                              source: `${citation}; ${portion.grams} g per ${portion.label}`,
                            }
                          : {
                              calories: food.kcal,
                              basisQuantity: 100,
                              quantity: 100,
                              unit: "g",
                              source: citation,
                            };
                        change({
                          ...draft,
                          items: draft.items.map((x, n) =>
                            n === index ? { ...x, calorie: cal } : x,
                          ),
                        });
                      }}
                    >
                      <option value="grams">Grams</option>
                      {food.portions.map((p, n) => (
                        <option key={n} value={p.label}>
                          {p.label} ({Math.round(p.grams * 10) / 10} g)
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null;
              })()}
              <label>
                Quantity ({item.calorie.unit})
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={item.calorie.quantity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value > 0)
                      change({
                        ...draft,
                        items: draft.items.map((x, n) =>
                          n === index
                            ? {
                                ...x,
                                calorie: { ...item.calorie!, quantity: value },
                              }
                            : x,
                        ),
                      });
                  }}
                />
              </label>
              <p>
                {itemCalories(item.calorie) === undefined
                  ? "Invalid value"
                  : `${Math.round(itemCalories(item.calorie)!)} kcal`}{" "}
                ({item.calorie.calories} kcal per {item.calorie.basisQuantity}{" "}
                {item.calorie.unit})
              </p>
            </>
          )}
        </fieldset>
      ))}
      <label>
        Write a meal
        <input
          placeholder="A dish, a food, or a combination"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addText();
            }
          }}
        />
      </label>
      <button className="full" disabled={!hasText} onClick={addText}>
        <Icon name="plus" /> Add written item
      </button>
      <div className="toolbar">
        <button onClick={voice}>
          <Icon name="mic" /> Voice
        </button>
        <button onClick={scan}>
          <Icon name="scan" /> Scan label
        </button>
      </div>
      <label>
        Saved foods
        <input
          type="search"
          placeholder="Search your library"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="picker">
        {searchFoods(
          data.foods.filter((f) => !f.archived),
          query,
        ).map((f) => (
          <div className="picker-row" key={f.id}>
            <button className="grow" onClick={() => details(f)}>
              {f.name}
            </button>
            <button
              className="square"
              aria-label={`Add ${f.name}`}
              onClick={() => {
                add(snapshot(f));
              }}
            >
              <Icon name="plus" />
            </button>
          </div>
        ))}
      </div>
      <label>
        Search common foods
        <input
          type="search"
          placeholder="Search Canadian and USDA foods"
          value={catalogQuery}
          onChange={(e) => setCatalogQuery(e.target.value)}
        />
      </label>
      <p className="muted">
        Canadian and USDA foods are searched on this device. Portions use
        documented serving sizes when available; otherwise values are per 100 g.
        Packaged foods can change, so use your package label when available.
      </p>
      <p className="muted">
        Canadian Nutrient File 2026, Health Canada. Contains information
        licensed under the{" "}
        <a
          href="https://open.canada.ca/en/open-government-licence-canada"
          target="_blank"
          rel="noreferrer"
        >
          Open Government Licence – Canada
        </a>
        .
      </p>
      {(["canada", "usda"] as const).map((source) => {
        const results = searchCatalog(source, catalogQuery);
        return (
          <section key={source}>
            <h3>{source === "canada" ? "Canadian foods" : "USDA foods"}</h3>
            {catalogQuery.trim().length >= 2 && results.length === 0 && (
              <p className="muted">No matching foods.</p>
            )}
            <div className="picker">
              {results.map((f) => {
                const serving = catalogServing(f, source, catalogQuery);
                return (
                  <div className="picker-row" key={`${source}-${f.id}`}>
                    <span className="grow">
                      {f.name}
                      <small>
                        {" · "}
                        {Math.round(serving.calories)} kcal per{" "}
                        {serving.unit === "g" ? "100 g" : serving.unit}
                        {f.updated && ` · energy updated ${f.updated}`}
                      </small>
                    </span>
                    <button
                      className="square"
                      aria-label={`Add ${source === "canada" ? "Canadian" : "USDA"} ${f.name}`}
                      onClick={() => add({ name: f.name, calorie: serving })}
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <label className="check-label">
        <input
          type="checkbox"
          checked={draft.saveTemplate}
          onChange={(e) =>
            change({
              ...draft,
              saveTemplate: e.target.checked,
              dishName:
                draft.dishName ||
                draft.title ||
                draft.items.map((i) => i.name).join(" + "),
            })
          }
        />
        {draft.items.length > 1 ? "Save as a dish" : "Save to library"}
      </label>
      {draft.saveTemplate && draft.items.length > 1 && (
        <label>
          Recipe yields this many servings
          <input
            type="number"
            min="0.01"
            step="any"
            value={draft.recipeServings || 1}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n > 0) change({ ...draft, recipeServings: n });
            }}
          />
        </label>
      )}
      {draft.saveTemplate && (
        <label>
          Dish name
          <input
            value={draft.dishName}
            onChange={(e) => change({ ...draft, dishName: e.target.value })}
          />
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted">
        Closing keeps your draft. Saving creates one meal.
      </p>
      <button className="danger text-button" onClick={discard}>
        Discard draft
      </button>
    </Modal>
  );
}
