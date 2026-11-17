import { useEffect, useRef, useState } from "react";
import type { Food, ImageAsset, Item } from "./types";
import { newId, base, snapshot } from "./types";
import {
  matches,
  Operation,
  recognitionConstructor,
  type RecognitionLike,
} from "./input";
import { preparePhoto, recognize, releaseOCR } from "./ocr";
import { Modal, InputModeSwitch } from "./ui";
import { extractLabelCalories } from "./labelCalories";
export function Voice({
  foods,
  consent,
  acceptConsent,
  close,
  use,
  initialMode = "manual",
  onModeChange,
}: {
  foods: Food[];
  consent: boolean;
  acceptConsent: () => Promise<void>;
  close: () => void;
  use: (i: Item) => void;
  initialMode?: "manual" | "automatic";
  onModeChange?: (mode: "manual" | "automatic") => void;
}) {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState<"manual" | "automatic">(initialMode);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const operation = useRef(new Operation());
  const recognition = useRef<RecognitionLike | undefined>(undefined);
  const Constructor = recognitionConstructor();
  function stop() {
    operation.current.cancel();
    recognition.current?.abort();
    recognition.current = undefined;
    setListening(false);
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        stop();
        setStatus("Listening interrupted. Your transcript is still editable.");
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  async function start() {
    if (!Constructor) return;
    try {
      const id = operation.current.start();
      if (!consent) await acceptConsent();
      if (!operation.current.current(id)) return;
      const r = new Constructor();
      recognition.current = r;
      r.lang = navigator.language || "en-CA";
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (e) => {
        if (!operation.current.current(id)) return;
        const result = Array.from((e?.results ?? []) as any[])
          .map((r: any) => r?.[0]?.transcript)
          .filter((part): part is string => typeof part === "string")
          .join(" ")
          .trim();
        if (!result) return;
        setText(result);
        setSelected("");
        if (result && modeRef.current === "automatic") {
          const found = matches(result, foods);
          const item =
            found.length === 1 ? snapshot(found[0]) : { name: result };
          stop();
          use(item);
        }
      };
      r.onerror = (e) => {
        if (!operation.current.current(id)) return;
        setStatus(
          (
            {
              "not-allowed":
                "Microphone permission denied. Use the text field or keyboard dictation.",
              network: "Speech service network error. Use the text field.",
              "service-not-allowed":
                "Speech service unavailable. Use keyboard dictation.",
            } as Record<string, string>
          )[e.error] ||
            "Speech interrupted or unavailable. Your text is retained.",
        );
        stop();
      };
      r.onend = () => {
        if (operation.current.current(id)) {
          operation.current.cancel();
          recognition.current = undefined;
          setListening(false);
          setStatus("Listening ended. Review your text before using it.");
        }
      };
      r.start();
      setListening(true);
      setStatus("Listening…");
    } catch {
      stop();
      setStatus(
        "Speech could not start. Use the text field or keyboard dictation.",
      );
    }
  }
  const found = matches(text, foods);
  return (
    <Modal
      title="Voice entry"
      onClose={() => {
        stop();
        close();
      }}
    >
      <InputModeSwitch
        mode={mode}
        onChange={(next) => {
          setMode(next);
          onModeChange?.(next);
        }}
      />
      <p>
        {mode === "automatic"
          ? "Recognized speech is added to your meal draft automatically."
          : "Review a name or description before adding it to your meal."}
      </p>
      <p className="muted">
        Browser speech may send audio to your browser provider for processing.
        This app does not retain audio.
      </p>
      {Constructor ? (
        <button
          className="primary full"
          onClick={() => (listening ? stop() : void start())}
        >
          {listening ? "Stop listening" : "Start browser speech"}
        </button>
      ) : (
        <p className="notice">Direct browser speech is unavailable here.</p>
      )}
      <p className="muted">
        Keyboard tip: tap the text field, then use the microphone on your iPhone
        keyboard if available. This page cannot activate keyboard dictation.
        When using keyboard dictation, tap Use transcript to return to your
        draft.
      </p>
      <label>
        Transcript
        <textarea
          value={text}
          onChange={(e) => {
            stop();
            setText(e.target.value);
            setSelected("");
          }}
          placeholder="Type or dictate a meal name"
        />
      </label>
      <p role="status">{status}</p>
      {found.length > 0 && (
        <fieldset>
          <legend>
            {found.length > 1
              ? "Choose a saved-food match"
              : "Saved-food match"}
          </legend>
          {found.map((f) => (
            <label
              className={`match check-label ${selected === f.id ? "chosen" : ""}`}
              key={f.id}
            >
              <input
                type="radio"
                name="match"
                checked={selected === f.id}
                onChange={() => setSelected(f.id)}
              />
              {f.name}
              {selected === f.id ? " · Selected" : ""}
            </label>
          ))}
        </fieldset>
      )}
      <div className="button-stack">
        <button
          className="primary"
          disabled={!selected}
          onClick={() => {
            const f = found.find((f) => f.id === selected);
            if (f) {
              stop();
              const {
                name,
                description,
                ingredients,
                notes,
                imageId,
                label,
                calorie,
              } = f;
              use({
                name,
                description,
                ingredients,
                notes,
                imageId,
                label,
                calorie,
                sourceId: f.id,
              });
            }
          }}
        >
          Use this food
        </button>
        <button
          disabled={!text.trim()}
          onClick={() => {
            stop();
            use({ name: text.trim() });
          }}
        >
          Use transcript
        </button>
      </div>
      <p className="muted">
        Neither action saves a meal. You will return to your draft.
      </p>
    </Modal>
  );
}
export function Scan({
  foods,
  target,
  close,
  save,
  add,
  autoUse,
  initialMode = "manual",
  onModeChange,
}: {
  foods: Food[];
  target?: Food;
  close: () => void;
  save: (f: Food, image?: ImageAsset) => Promise<Food>;
  add: (f: Food) => void;
  autoUse: (
    item: Item,
    image: ImageAsset | undefined,
    active: () => boolean,
  ) => Promise<void>;
  initialMode?: "manual" | "automatic";
  onModeChange?: (mode: "manual" | "automatic") => void;
}) {
  const [mode, setMode] = useState<"manual" | "automatic">(initialMode);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [foodId, setFoodId] = useState(target?.id || "");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Food>();
  const photo = useRef<ImageAsset | undefined>(undefined);
  const op = useRef(new Operation());
  const textRef = useRef(text);
  textRef.current = text;
  function cancel() {
    op.current.cancel();
    void releaseOCR();
    setBusy(false);
    setProgress("Scan cancelled. Photo and text are retained.");
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      op.current.cancel();
      void releaseOCR();
      photo.current = undefined;
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  async function select(file?: File) {
    if (!file) return;
    cancel();
    setError("");
    setReviewed(false);
    const id = op.current.start();
    try {
      const p = await preparePhoto(file);
      if (!op.current.current(id)) return;
      const asset = { id: newId(), mime: p.blob.type, ...p };
      photo.current = asset;
      setUrl(URL.createObjectURL(p.blob));
      setProgress("Photo ready. Check that the label is readable.");
      if (modeRef.current === "automatic") await run(asset);
    } catch (e) {
      if (op.current.current(id)) setError((e as Error).message);
    }
  }
  async function run(asset = photo.current) {
    if (!asset) return;
    const id = op.current.start();
    setBusy(true);
    setError("");
    setReviewed(false);
    try {
      const out = await recognize(asset.blob, (s) => {
        if (op.current.current(id)) setProgress(s);
      });
      if (op.current.current(id)) {
        setText(out);
        if (out.trim() && modeRef.current === "automatic") {
          const food = foods.find((f) => f.id === foodId);
          const item: Item = food
            ? snapshot(food)
            : { name: name.trim() || "Scanned food" };
          item.label = { text: out, reviewed: false, imageId: asset.id };
          item.calorie = extractLabelCalories(out);
          const active = () =>
            op.current.current(id) && modeRef.current === "automatic";
          await autoUse(item, asset, active);
          if (active()) op.current.cancel();
          return;
        }
        setProgress(
          out.trim()
            ? "Extracted text is unreviewed. Check units, serving sizes and uncertain text."
            : "No readable text found. Enter text manually or use the photo only.",
        );
      }
    } catch (e) {
      if (op.current.current(id)) setError((e as Error).message);
    } finally {
      if (op.current.current(id)) setBusy(false);
    }
  }
  async function persist(photoOnly = false) {
    setBusy(true);
    setError("");
    try {
      const existing = foods.find((f) => f.id === foodId);
      const f: Food = existing || {
        ...base(),
        name: name.trim(),
        favourite: false,
        archived: false,
      };
      const result = await save(
        {
          ...f,
          label: {
            text: photoOnly ? "" : text,
            reviewed: !photoOnly,
            imageId: photo.current?.id,
          },
        },
        photo.current,
      );
      setSaved(result);
      await releaseOCR();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const canSave = !!(foodId || name.trim());
  return (
    <Modal
      title="Scan label"
      onClose={() => {
        cancel();
        close();
      }}
    >
      <InputModeSwitch
        mode={mode}
        onChange={(next) => {
          setMode(next);
          onModeChange?.(next);
        }}
      />
      {saved ? (
        <>
          <p className="notice">
            Label saved to {saved.name}. No meal was logged.
          </p>
          <button className="primary full" onClick={() => add(saved)}>
            Add to meal
          </button>
          <button className="full" onClick={close}>
            Done
          </button>
        </>
      ) : (
        <>
          <p>
            {mode === "automatic"
              ? "After you choose a photo, the scan is added to your meal draft. Calories are included only when the label states an unambiguous value and serving. Scanned text is unreviewed."
              : "A label is a reference, not a nutrition calculation. Photos and OCR stay on your device."}
          </p>
          <label>
            Camera or photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => void select(e.target.files?.[0])}
            />
          </label>
          <label>
            Choose from photo library
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void select(e.target.files?.[0])}
            />
          </label>
          {url && (
            <>
              <img
                className="label-preview"
                src={url}
                alt="Selected label. Check readability before scanning."
              />
              <button
                onClick={() => {
                  cancel();
                  photo.current = undefined;
                  setUrl("");
                  setReviewed(false);
                }}
              >
                Remove selected photo, keep text
              </button>
            </>
          )}
          <p className="muted">
            Use your phone's Photos tools to rotate or crop first. English and
            French OCR is bundled; bilingual or multi-column results need
            careful review.
          </p>
          <button
            className="full"
            disabled={!url || busy}
            onClick={() => void run()}
          >
            Extract label text
          </button>
          {busy && (
            <button className="full" onClick={cancel}>
              Cancel scan
            </button>
          )}
          <p role="status">{progress}</p>
          <label>
            Label text{" "}
            <span className="muted">manual correction available</span>
            <textarea
              rows={7}
              value={text}
              onChange={(e) => {
                cancel();
                setText(e.target.value);
                setReviewed(false);
              }}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed this text
          </label>
          <label>
            Attach to a food
            <select value={foodId} onChange={(e) => setFoodId(e.target.value)}>
              <option value="">Create a saved food</option>
              {foods
                .filter((f) => !f.archived)
                .map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </label>
          {!foodId && (
            <label>
              Food name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <div className="button-stack">
            <button
              className="primary"
              disabled={!canSave || !reviewed || !text.trim() || busy}
              onClick={() => void persist()}
            >
              Save label
            </button>
            <button
              disabled={!canSave || !url || busy}
              onClick={() => void persist(true)}
            >
              Use photo only
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
