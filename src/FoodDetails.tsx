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
            disabled={!f.name.trim() || busy}
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
