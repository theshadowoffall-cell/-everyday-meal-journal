import { validCalorieValue, recipePerServing } from "./calories";
import { useState } from "react";
import type { Food, ImageAsset } from "./types";
import { base } from "./types";
import { preparePhoto } from "./ocr";
import { Modal, Photo } from "./ui";
export function FoodDetails({
  food,
  pins,
  urls,
  close,
  save,
  add,
  togglePin,
  scan,
}: {
  food?: Food;
  pins: string[];
  urls: Record<string, string>;
  close: () => void;
  save: (f: Food, image?: ImageAsset) => Promise<void>;
  add: (f: Food) => void;
  togglePin: (f: Food) => void;
  scan: (f: Food) => void;
}) {
  const [editing, setEditing] = useState(!food);
  const [f, setF] = useState<Food>(
    food || { ...base(), name: "", favourite: false, archived: false },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<ImageAsset>();
  function updateRecipe(recipe: NonNullable<Food["recipe"]>) {
    const per = recipePerServing(recipe.items, recipe.servings);
    setF({
      ...f,
      recipe,
      calorie:
        per === undefined
          ? undefined
          : {
              calories: per,
              basisQuantity: 1,
              quantity: 1,
              unit: "serving",
              source: "Recipe calculated from saved ingredient values",
            },
    });
  }
  async function persist(next = f) {
    setBusy(true);
    try {
      await save(next, image);
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={editing ? (food ? "Edit details" : "Save a food") : f.name}
      onClose={close}
      footer={
        editing ? (
          <button
            className="primary full"
            disabled={
              !f.name.trim() ||
              busy ||
              (!!f.calorie && !validCalorieValue(f.calorie))
            }
            onClick={() => void persist()}
          >
            {busy ? "Saving…" : "Save food"}
          </button>
        ) : (
          <button
            className="primary full"
            disabled={f.archived}
            onClick={() => add(f)}
          >
            Add to meal
          </button>
        )
      }
    >
      {editing ? (
        <>
          <label>
            Name
            <input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </label>
          {f.recipe ? (
            <fieldset>
              <legend>Edit recipe</legend>
              <label>
                Recipe servings
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={f.recipe.servings}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (n > 0) updateRecipe({ ...f.recipe!, servings: n });
                  }}
                />
              </label>
              {f.recipe.items.map((item, index) => (
                <div key={index}>
                  <strong>{item.name}</strong>
                  {item.calorie ? (
                    <label>
                      Quantity ({item.calorie.unit})
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.calorie.quantity}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (n > 0)
                            updateRecipe({
                              ...f.recipe!,
                              items: f.recipe!.items.map((i, k) =>
                                k === index
                                  ? {
                                      ...i,
                                      calorie: { ...i.calorie!, quantity: n },
                                    }
                                  : i,
                              ),
                            });
                        }}
                      />
                    </label>
                  ) : (
                    <p>Calories unknown</p>
                  )}
                  {f.recipe!.items.length > 1 && (
                    <button
                      onClick={() =>
                        updateRecipe({
                          ...f.recipe!,
                          items: f.recipe!.items.filter((_, k) => k !== index),
                        })
                      }
                    >
                      Remove {item.name}
                    </button>
                  )}
                </div>
              ))}
              <p>
                {f.calorie
                  ? `${Math.round(f.calorie.calories)} kcal per serving`
                  : "Recipe calories incomplete"}
              </p>
            </fieldset>
          ) : (
            <>
              <label>
                Calories for saved food (optional)
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={f.calorie?.calories ?? ""}
                  onChange={(e) =>
                    setF({
                      ...f,
                      calorie:
                        e.target.value === ""
                          ? undefined
                          : {
                              calories: Number(e.target.value),
                              basisQuantity: f.calorie?.basisQuantity || 1,
                              quantity: f.calorie?.basisQuantity || 1,
                              unit: f.calorie?.unit || "serving",
                              source: "User entered food label",
                            },
                    })
                  }
                />
              </label>
              {f.calorie && (
                <>
                  <label>
                    Serving size
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={f.calorie.basisQuantity}
                      onChange={(e) =>
                        setF({
                          ...f,
                          calorie: {
                            ...f.calorie!,
                            basisQuantity: Number(e.target.value),
                            quantity: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Serving unit
                    <input
                      value={f.calorie.unit}
                      onChange={(e) =>
                        setF({
                          ...f,
                          calorie: { ...f.calorie!, unit: e.target.value },
                        })
                      }
                    />
                  </label>
                  <p className="muted">
                    Copy the serving and calories from the label. Use g, ml, or
                    a named serving.
                  </p>
                </>
              )}
            </>
          )}
          <label>
            Aliases <span className="muted">one per line</span>
            <textarea
              value={f.aliases?.join("\n") || ""}
              onChange={(e) =>
                setF({
                  ...f,
                  aliases: e.target.value.split("\n").filter(Boolean),
                })
              }
            />
          </label>
          <label>
            Type <span className="muted">optional</span>
            <input
              value={f.type || ""}
              onChange={(e) => setF({ ...f, type: e.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              value={f.description || ""}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </label>
          <label>
            Ingredients
            <textarea
              value={f.ingredients || ""}
              onChange={(e) => setF({ ...f, ingredients: e.target.value })}
            />
          </label>
          <label>
            Notes
            <textarea
              value={f.notes || ""}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={f.favourite}
              onChange={(e) => setF({ ...f, favourite: e.target.checked })}
            />
            Favourite
          </label>
          <label>
            Optional photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  const prepared = await preparePhoto(file);
                  const i = {
                    id: crypto.randomUUID(),
                    mime: prepared.blob.type,
                    ...prepared,
                  };
                  setImage(i);
                  setF({ ...f, imageId: i.id });
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {f.imageId && (
            <button
              onClick={() => {
                setF({ ...f, imageId: undefined });
                setImage(undefined);
              }}
            >
              Remove photo from food
            </button>
          )}
          <p className="muted">
            Historical meals keep their original text and photos.
          </p>
        </>
      ) : (
        <>
          <div className="food-detail-heading">
            <Photo url={urls[f.imageId || ""]} name={f.name} />
            <p>
              {pins.includes(f.id)
                ? "Pinned to Today"
                : f.favourite
                  ? "Favourite"
                  : "Saved food"}
              {f.archived ? " · Archived" : ""}
            </p>
          </div>
          {f.calorie && (
            <p>
              {f.calorie.calories} kcal per {f.calorie.basisQuantity}{" "}
              {f.calorie.unit} · {f.calorie.source}
            </p>
          )}
          {f.recipe && (
            <>
              <h3>Recipe · {f.recipe.servings} servings</h3>
              {f.recipe.items.map((item, n) => (
                <p key={n}>
                  {item.name}
                  {item.calorie
                    ? ` · ${item.calorie.quantity} ${item.calorie.unit}`
                    : " · calories unknown"}
                </p>
              ))}
            </>
          )}
          {f.description && <p>{f.description}</p>}
          {f.ingredients && (
            <>
              <h3>Ingredients</h3>
              <p className="preserve">{f.ingredients}</p>
            </>
          )}
          {f.notes && (
            <>
              <h3>Notes</h3>
              <p className="preserve">{f.notes}</p>
            </>
          )}
          {Boolean(f.aliases?.length) && (
            <p className="muted">Also called {f.aliases?.join(", ")}</p>
          )}
          {f.label && (
            <>
              <h3>Label reference</h3>
              {f.label.imageId && (
                <img
                  className="label-preview"
                  src={urls[f.label.imageId]}
                  alt="Saved nutrition label"
                />
              )}
              <p className="preserve">{f.label.text || "Photo only"}</p>
              <small>
                {f.label.reviewed
                  ? "Text reviewed by you"
                  : "Photo reference, no verified extracted text"}
              </small>
            </>
          )}
          <div className="button-stack">
            <button onClick={() => setEditing(true)}>Edit details</button>
            {!f.archived && (
              <>
                <button onClick={() => togglePin(f)}>
                  {pins.includes(f.id) ? "Unpin from Today" : "Pin to Today"}
                </button>
                <button onClick={() => scan(f)}>
                  Attach a label reference
                </button>
              </>
            )}
            <button
              className="danger"
              disabled={busy}
              onClick={() => void persist({ ...f, archived: !f.archived })}
            >
              {f.archived ? "Unarchive food" : "Archive dish"}
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
