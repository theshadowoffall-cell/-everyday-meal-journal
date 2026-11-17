import { useState } from "react";
import type { Data, Food } from "./types";
import { Empty, Icon, Photo } from "./ui";
export function Library({
  data,
  details,
  add,
  newFood,
  urls,
}: {
  data: Data;
  details: (f: Food) => void;
  add: (f: Food) => void;
  newFood: () => void;
  urls: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const p = data.preferences[0].pins;
  const foods = data.foods.filter((f) => (archived ? f.archived : !f.archived));
  const results = foods.filter((f) =>
    [f.name, ...(f.aliases || [])]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const recentIds = [
    ...new Set(
      [...data.meals]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .flatMap((m) => m.items.map((i) => i.sourceId))
        .filter(Boolean),
    ),
  ].slice(0, 4);
  function rows(title: string, fs: Food[]) {
    return fs.length ? (
      <section key={title}>
        <h2>{title}</h2>
        {fs.map((f) => (
          <div className="library-row" key={f.id}>
            <button className="library-details" onClick={() => details(f)}>
              <Photo url={urls[f.imageId || ""]} name="" />
              <span>
                <strong>{f.name}</strong>
                <small>
                  {f.archived
                    ? "Archived"
                    : f.favourite
                      ? "Favourite"
                      : f.type || "Saved food"}
                </small>
              </span>
            </button>
            {!f.archived && (
              <button
                className="square"
                aria-label={`Add ${f.name}`}
                onClick={() => add(f)}
              >
                <Icon name="plus" />
              </button>
            )}
          </div>
        ))}
      </section>
    ) : null;
  }
  return (
    <>
      <label className="search-label">
        Search saved foods
        <input
          type="search"
          placeholder="Find a familiar meal…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="toolbar">
        <button onClick={newFood}>
          <Icon name="plus" /> Save a food
        </button>
        <button aria-pressed={archived} onClick={() => setArchived(!archived)}>
          {archived ? "Show active" : "Archived"}
        </button>
      </div>
      {query || archived ? (
        rows(query ? "Search results" : "Archived foods", results)
      ) : (
        <>
          {rows(
            "Recent selections",
            recentIds
              .map((id) => foods.find((f) => f.id === id))
              .filter((f): f is Food => !!f && !p.includes(f.id)),
          )}
          {rows(
            "Pinned to Today",
            p
              .map((id) => foods.find((f) => f.id === id))
              .filter((f): f is Food => !!f),
          )}
          {rows(
            "Other saved foods",
            foods.filter((f) => !p.includes(f.id)),
          )}
        </>
      )}
      {!results.length && (
        <Empty>
          {query
            ? "No matching foods."
            : "No saved foods yet. Save something you enjoy eating again."}
        </Empty>
      )}
    </>
  );
}
