import { useEffect, useRef, useState } from "react";
import { JournalDB, createDraft, type Undo } from "./storage";
import {
  base,
  emptyData,
  snapshot,
  timestamp,
  type Data,
  type Draft,
  type Food,
  type ImageAsset,
  type Item,
  type Meal,
} from "./types";
import { localDate, dateLabel } from "./dates";
import { Today } from "./Today";
import { Library } from "./Library";
import { Progress } from "./Progress";
import { Editor } from "./Editor";
import { FoodDetails } from "./FoodDetails";
import { Voice, Scan } from "./InputFlows";
import { Settings } from "./Settings";
import { Icon, Modal } from "./ui";
export function App({ database }: { database?: JournalDB }) {
  const [db] = useState(() => database || new JournalDB());
  const [data, setData] = useState<Data>(emptyData());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Today");
  const [date, setDate] = useState(localDate());
  const dateRef = useRef(date);
  dateRef.current = date;
  const idleToday = useRef(date === localDate());
  const [draft, setDraft] = useState<Draft>();
  const draftRef = useRef<Draft | undefined>(undefined);
  const [editor, setEditor] = useState(false);
  const [flow, setFlow] = useState<"voice" | "scan">();
  const [food, setFood] = useState<Food | null | undefined>();
  const [scanTarget, setScanTarget] = useState<Food>();
  const [settings, setSettings] = useState(false);
  const [history, setHistory] = useState<Meal>();
  const [statusDate, setStatusDate] = useState<string>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const [undo, setUndo] = useState<Undo>();
  const [message, setMessage] = useState("");
  const [replacement, setReplacement] = useState<Food>();
  const [startRequest, setStartRequest] = useState<(() => void) | undefined>();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const generation = useRef(1);
  const queue = useRef(Promise.resolve());
  const draftError = useRef("");
  const persistedRevision = useRef(0);
  async function refresh() {
    const next = await db.read();
    if (next.meta[0].value !== generation.current) {
      setFlow(undefined);
      setScanTarget(undefined);
      setUndo(undefined);
      setError(
        "Data was restored in another tab. Copy any unsaved draft text before reloading. Older writes are blocked.",
      );
    }
    setData(next);
  }
  useEffect(() => {
    let live = true;
    db.read()
      .then((d) => {
        if (!live) return;
        generation.current = d.meta[0].value;
        setData(d);
        setDraft(d.drafts[0]);
        draftRef.current = d.drafts[0];
        persistedRevision.current = d.drafts[0]?.revision || 0;
        setReady(true);
      })
      .catch((e) => setError(e.message));
    const off = db.subscribe(
      () => void refresh().catch((e) => setError(e.message)),
    );
    const issue = (e: Event) => setError((e as CustomEvent).detail);
    window.addEventListener("storage-issue", issue);
    return () => {
      live = false;
      off();
      window.removeEventListener("storage-issue", issue);
    };
  }, [db]);
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const i of data.images) map[i.id] = URL.createObjectURL(i.blob);
    setUrls(map);
    return () => Object.values(map).forEach(URL.revokeObjectURL);
  }, [data.images]);
  useEffect(() => {
    let lastToday = localDate();
    const tick = () => {
      const today = localDate();
      if (today !== lastToday) {
        if (
          dateRef.current === lastToday &&
          idleToday.current &&
          !draftRef.current
        )
          setDate(today);
        lastToday = today;
      }
    };
    const id = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  function chooseDate(s: string) {
    setDate(s);
    idleToday.current = s === localDate();
  }
  async function perform(action: () => Promise<void>) {
    try {
      setError("");
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function persistDraft(next: Draft | undefined) {
    const previous = draftRef.current;
    const expected = previous?.revision || 0;
    const updated = next ? { ...next, revision: expected + 1 } : undefined;
    draftRef.current = updated;
    setDraft(updated);
    const gen = generation.current;
    queue.current = queue.current
      .then(async () => {
        if (draftError.current) throw Error(draftError.current);
        await db.writeDraft(updated, expected, gen);
        persistedRevision.current = updated?.revision || 0;
      })
      .catch((e) => {
        draftError.current = e.message;
        setError(e.message);
      });
  }
  function changeDraft(next: Draft) {
    persistDraft(next);
  }
  function initiate(items: Item[] = [], meal?: Meal) {
    const start = () => {
      setError("");
      draftError.current = "";
      persistDraft(createDraft(data, meal?.date || date, items, meal));
      setEditor(true);
    };
    if (draftRef.current) {
      setStartRequest(() => start);
    } else start();
  }
  function addFood(f: Food) {
    setFood(undefined);
    setFlow(undefined);
    if (editor && draftRef.current) {
      changeDraft({
        ...draftRef.current,
        items: [...draftRef.current.items, snapshot(f)],
      });
    } else initiate([snapshot(f)]);
  }
  async function discard() {
    await queue.current;
    if (draftError.current) throw Error(draftError.current);
    persistDraft(undefined);
    await queue.current;
    if (draftError.current) throw Error(draftError.current);
    setEditor(false);
  }
  async function saveMeal() {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    setError("");
    try {
      await queue.current;
      if (draftError.current && draftRef.current) {
        const recovered = {
          ...draftRef.current,
          revision: persistedRevision.current + 1,
        };
        await db.writeDraft(
          recovered,
          persistedRevision.current,
          generation.current,
        );
        persistedRevision.current = recovered.revision;
        draftRef.current = recovered;
        setDraft(recovered);
        draftError.current = "";
      }
      const dr = draftRef.current;
      if (!dr) throw Error("No active draft.");
      const u = await db.saveMeal(dr, generation.current);
      draftRef.current = undefined;
      persistedRevision.current = 0;
      setDraft(undefined);
      setEditor(false);
      setUndo(u);
      setMessage("Meal saved");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  async function saveFood(f: Food, image?: ImageAsset): Promise<Food> {
    let result!: Food;
    let foodUndo: Undo | undefined;
    await db.mutate(generation.current, (d) => {
      const old = d.foods.find((x) => x.id === f.id);
      if (old && old.revision !== f.revision)
        throw Error("Food changed in another tab. Reload it before saving.");
      const beforePins = [...d.preferences[0].pins];
      result = {
        ...f,
        name: f.name.trim(),
        revision: (old?.revision || 0) + 1,
        updatedAt: timestamp(),
      };
      if (!result.name) throw Error("Food name is required.");
      d.foods = d.foods.filter((x) => x.id !== f.id).concat(result);
      if (image && !d.images.some((i) => i.id === image.id))
        d.images.push(image);
      if (result.archived || !result.favourite)
        d.preferences[0].pins = d.preferences[0].pins.filter(
          (id) => id !== f.id,
        );
      foodUndo = {
        store: "foods",
        id: f.id,
        before: old,
        after: result,
        generation: generation.current,
        version: (d.meta[0].counter || 0) + 1,
        beforePins,
        afterPins: [...d.preferences[0].pins],
      };
    });
    setUndo(foodUndo);
    setMessage(f.archived ? "Food archived" : "Food saved");
    await refresh();
    return result;
  }
  async function pin(f: Food, replaceId?: string) {
    let pinUndo: Undo | undefined;
    await db.mutate(generation.current, (d) => {
      const current = d.foods.find((x) => x.id === f.id);
      if (!current || current.archived) throw Error("Food is unavailable.");
      const p = d.preferences[0];
      const before = structuredClone(current);
      const beforePins = [...p.pins];
      if (p.pins.includes(f.id)) {
        p.pins = p.pins.filter((id) => id !== f.id);
        current.revision++;
        current.updatedAt = timestamp();
      } else {
        if (p.pins.length === 2) {
          if (!replaceId) throw Error("Choose a tile to replace.");
          p.pins = p.pins.map((id) => (id === replaceId ? f.id : id));
        } else p.pins.push(f.id);
        current.favourite = true;
        current.revision++;
        current.updatedAt = timestamp();
      }
      pinUndo = {
        store: "foods",
        id: f.id,
        before,
        after: structuredClone(current),
        generation: generation.current,
        version: (d.meta[0].counter || 0) + 1,
        beforePins,
        afterPins: [...p.pins],
      };
    });
    setUndo(pinUndo);
    setMessage("Pin choices saved");
    setFood(undefined);
    setReplacement(undefined);
  }
  function togglePin(f: Food) {
    if (
      !data.preferences[0].pins.includes(f.id) &&
      data.preferences[0].pins.length === 2
    )
      setReplacement(f);
    else void perform(() => pin(f));
  }
  async function workout(state: "workout" | "rest" | "clear", s = date) {
    const old = data.workouts.find((w) => w.id === s);
    const u =
      state === "clear"
        ? old
          ? await db.remove("workouts", s, old.revision, generation.current)
          : undefined
        : await db.putRecord(
            "workouts",
            { id: s, state },
            old?.revision || 0,
            generation.current,
          );
    setUndo(u);
    setMessage(
      state === "clear"
        ? "Workout record cleared"
        : state === "rest"
          ? "Rest day recorded"
          : "Workout logged",
    );
    setStatusDate(undefined);
  }
  function workoutAction() {
    const w = data.workouts.find((w) => w.id === date);
    if (w?.state === "workout") setStatusDate(date);
    else void perform(() => workout("workout"));
  }
  function append(i: Item) {
    if (draftRef.current) {
      changeDraft({
        ...draftRef.current,
        items: [...draftRef.current.items, i],
      });
      setFlow(undefined);
    }
  }
  if (!ready)
    return (
      <div className="loading">
        <h1>Everyday</h1>
        <p>{error || "Opening your journal…"}</p>
      </div>
    );
  const overlay =
    (editor && !!draft) ||
    settings ||
    food !== undefined ||
    !!history ||
    !!statusDate ||
    !!replacement ||
    !!startRequest;
  return (
    <>
      <div
        className="app"
        aria-hidden={overlay ? true : undefined}
        inert={overlay ? true : undefined}
      >
        <header className="page-header">
          <div>
            <p className="eyebrow">
              {tab === "Today"
                ? dateLabel(date, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "EVERYDAY JOURNAL"}
            </p>
            <h1>
              {tab === "Today"
                ? date === localDate()
                  ? "Today"
                  : dateLabel(date, { month: "long", day: "numeric" })
                : tab}
            </h1>
          </div>
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => setSettings(true)}
          >
            <Icon name="gear" />
          </button>
        </header>
        <main>
          {tab === "Today" ? (
            <Today
              data={data}
              date={date}
              setDate={chooseDate}
              add={(f) => initiate(f ? [snapshot(f)] : [])}
              details={setFood}
              editMeal={setHistory}
              workout={workoutAction}
              dayDetails={() => setStatusDate(date)}
              library={() => setTab("Library")}
              urls={urls}
            />
          ) : tab === "Library" ? (
            <Library
              data={data}
              details={setFood}
              add={addFood}
              newFood={() => setFood(null)}
              urls={urls}
            />
          ) : (
            <Progress
              data={data}
              editMeal={setHistory}
              urls={urls}
              openDate={(s) => {
                chooseDate(s);
                setTab("Today");
              }}
            />
          )}
        </main>
        <div className="bottom">
          <div className="primary-area">
            {tab === "Today" && (
              <button className="primary full" onClick={() => initiate()}>
                <Icon name="plus" /> Add meal
              </button>
            )}
            {draft && !editor && (
              <button className="draft-resume" onClick={() => setEditor(true)}>
                Resume saved draft
              </button>
            )}
          </div>
          <nav aria-label="Main navigation">
            {["Today", "Library", "Progress"].map((t) => (
              <button
                key={t}
                aria-current={tab === t ? "page" : undefined}
                onClick={() => setTab(t)}
              >
                <Icon name={t.toLowerCase()} />
                <span>{t}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      {error && !editor && (
        <div className="global-error" role="alert">
          {error}
          <button onClick={() => location.reload()}>
            Reload to review saved data
          </button>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {message && !overlay && (
        <div className="toast" role="status">
          <span>{message}</span>
          {undo && (
            <button
              onClick={() =>
                void perform(async () => {
                  await db.undo(undo);
                  setUndo(undefined);
                  setMessage("Undone");
                })
              }
            >
              Undo
            </button>
          )}
          <button
            aria-label="Dismiss message"
            onClick={() => {
              setMessage("");
              setUndo(undefined);
            }}
          >
            ×
          </button>
        </div>
      )}
      {editor && draft && !flow && food === undefined && !startRequest && (
        <Editor
          draft={draft}
          data={data}
          change={changeDraft}
          save={() => void saveMeal()}
          close={() => setEditor(false)}
          discard={() => void perform(discard)}
          voice={() => setFlow("voice")}
          scan={() => {
            setScanTarget(undefined);
            setFlow("scan");
          }}
          pending={pending}
          error={error}
          details={setFood}
        />
      )}
      {flow === "voice" && (
        <Voice
          foods={data.foods}
          consent={!!data.preferences[0].speechConsent}
          acceptConsent={() =>
            db.prefs((p) => {
              p.speechConsent = true;
            }, generation.current)
          }
          close={() => setFlow(undefined)}
          use={append}
        />
      )}
      {flow === "scan" && (
        <Scan
          foods={data.foods}
          target={scanTarget}
          close={() => setFlow(undefined)}
          save={saveFood}
          add={addFood}
        />
      )}
      {food !== undefined && !flow && !replacement && (
        <FoodDetails
          food={food || undefined}
          pins={data.preferences[0].pins}
          urls={urls}
          close={() => setFood(undefined)}
          save={async (f, image) => {
            await saveFood(f, image);
          }}
          add={addFood}
          togglePin={togglePin}
          scan={(f) => {
            setScanTarget(f);
            setFood(undefined);
            setFlow("scan");
          }}
        />
      )}
      {settings && (
        <Settings
          data={data}
          close={() => setSettings(false)}
          exported={(s) =>
            db.prefs((p) => {
              p.lastExport = s;
            }, generation.current)
          }
          dismiss={() =>
            void perform(() =>
              db.prefs((p) => {
                p.reminderDismissed = true;
              }, generation.current),
            )
          }
          replace={async (incoming) => {
            await queue.current;
            await db.restore(incoming, generation.current);
            generation.current++;
            draftError.current = "";
            draftRef.current = incoming.drafts[0];
            persistedRevision.current = incoming.drafts[0]?.revision || 0;
            setDraft(incoming.drafts[0]);
            setUndo(undefined);
            setMessage("");
            setEditor(false);
            setFlow(undefined);
            setFood(undefined);
            setHistory(undefined);
            await refresh();
          }}
        />
      )}
      {startRequest && (
        <Modal
          title="A meal draft is waiting"
          onClose={() => setStartRequest(undefined)}
        >
          <p>
            Your unfinished meal is saved. Choose what to do before starting
            another.
          </p>
          <div className="button-stack">
            <button
              className="primary"
              onClick={() => {
                setStartRequest(undefined);
                setEditor(true);
              }}
            >
              Resume draft
            </button>
            <button
              onClick={() =>
                void perform(async () => {
                  const start = startRequest;
                  await discard();
                  setStartRequest(undefined);
                  start();
                })
              }
            >
              Discard and start new
            </button>
          </div>
        </Modal>
      )}
      {replacement && (
        <Modal
          title="Choose a tile to replace"
          onClose={() => setReplacement(undefined)}
        >
          <p>
            Today holds two pinned meals. Choose which one to replace with{" "}
            {replacement.name}.
          </p>
          <div className="button-stack">
            {data.preferences[0].pins.map((id) => (
              <button
                key={id}
                onClick={() => void perform(() => pin(replacement, id))}
              >
                {data.foods.find((f) => f.id === id)?.name}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {statusDate && (
        <Modal title="Workout status" onClose={() => setStatusDate(undefined)}>
          <p>{dateLabel(statusDate)}</p>
          <div className="button-stack">
            <button
              onClick={() => void perform(() => workout("workout", statusDate))}
            >
              Log workout
            </button>
            <button
              onClick={() => void perform(() => workout("rest", statusDate))}
            >
              Rest day
            </button>
            <button
              onClick={() => void perform(() => workout("clear", statusDate))}
            >
              Clear record
            </button>
          </div>
        </Modal>
      )}
      {history && (
        <Modal
          title={history.title || "Meal details"}
          onClose={() => setHistory(undefined)}
        >
          <p>
            {dateLabel(history.date)} · {history.category}
          </p>
          {history.items.map((i, n) => (
            <div key={n}>
              <h3>{i.name}</h3>
              {i.description && <p>{i.description}</p>}
              {i.ingredients && <p className="preserve">{i.ingredients}</p>}
              {i.notes && <p>{i.notes}</p>}
              {i.imageId && (
                <img
                  className="label-preview"
                  src={urls[i.imageId]}
                  alt={i.name}
                />
              )}
            </div>
          ))}
          {history.notes && <p>{history.notes}</p>}
          <div className="button-stack">
            <button
              disabled={history.date > localDate()}
              onClick={() => {
                const m = history;
                setHistory(undefined);
                initiate([], m);
              }}
            >
              Edit meal
            </button>
            <button
              onClick={() => {
                const m = history;
                setHistory(undefined);
                initiate(structuredClone(m.items));
              }}
            >
              Copy to a new meal
            </button>
            <button
              className="danger"
              onClick={() =>
                void perform(async () => {
                  const u = await db.remove(
                    "meals",
                    history.id,
                    history.revision,
                    generation.current,
                  );
                  setUndo(u);
                  setMessage("Meal deleted");
                  setHistory(undefined);
                })
              }
            >
              Delete meal
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
