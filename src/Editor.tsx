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
          disabled={pending || (!draft.items.length && !hasText)}
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
        {data.foods
          .filter(
            (f) =>
              !f.archived &&
              [f.name, ...(f.aliases || [])]
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          .map((f) => (
            <div className="picker-row" key={f.id}>
              <button className="grow" onClick={() => details(f)}>
                {f.name}
              </button>
              <button
                className="square"
                aria-label={`Add ${f.name}`}
                onClick={() => {
                  const {
                    name,
                    description,
                    ingredients,
                    notes,
                    imageId,
                    label,
                  } = f;
                  add({
                    name,
                    description,
                    ingredients,
                    notes,
                    imageId,
                    label,
                    sourceId: f.id,
                  });
                }}
              >
                <Icon name="plus" />
              </button>
            </div>
          ))}
      </div>
      <label>
        Meal title <span className="muted">optional</span>
        <input
          value={draft.title || ""}
          onChange={(e) => change({ ...draft, title: e.target.value })}
        />
      </label>
      <label>
        Notes <span className="muted">optional</span>
        <textarea
          value={draft.notes || ""}
          onChange={(e) => change({ ...draft, notes: e.target.value })}
        />
      </label>
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
