import { useState } from "react";
import type { Data } from "./types";
import { LIMITS } from "./validation";
import { exportJSON, importJSON, download } from "./backup";
import { Modal } from "./ui";
export function Settings({
  data,
  close,
  exported,
  replace,
  dismiss,
  setCalorieView,
}: {
  data: Data;
  close: () => void;
  exported: (s: string) => Promise<void>;
  replace: (d: Data) => Promise<void>;
  dismiss: () => void;
  setCalorieView?: (view: "daily" | "weekly" | "monthly") => Promise<void>;
}) {
  const [incoming, setIncoming] = useState<Data>();
  const [calorieView, setView] = useState<"daily" | "weekly" | "monthly">(
    data.preferences[0].calorieView || "daily",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  async function exportCurrent() {
    setBusy(true);
    setError("");
    try {
      const text = await exportJSON(data);
      download(
        text,
        `everyday-journal-${new Date().toISOString().slice(0, 10)}.json`,
      );
      await exported(new Date().toISOString());
      setDone(
        "Export created. Check your downloads and store a copy somewhere safe.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > LIMITS.backupBytes)
        throw Error("Backup exceeds the 24 MiB limit.");
      setIncoming(await importJSON(await file.text()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!incoming) return;
    setBusy(true);
    try {
      await replace(incoming);
      setIncoming(undefined);
      setDone("Replacement completed. The restored records are now loaded.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={incoming ? "Review restore" : "Settings"}
      onClose={() => {
        if (!busy) {
          if (incoming) setIncoming(undefined);
          else close();
        }
      }}
    >
      {incoming ? (
        <>
          <p className="warning">
            <strong>This replaces all app records on this device</strong>
          </p>
          <ul className="restore-counts">
            <li>{incoming.meals.length} meal entries</li>
            <li>{incoming.foods.length} saved foods</li>
            <li>{incoming.images.length} photos</li>
            <li>{incoming.workouts.length} workout or rest records</li>
            <li>{incoming.drafts.length} drafts</li>
          </ul>
          <p>
            Current records and preferences will be replaced. This cannot be
            undone. Exporting does not confirm replacement.
          </p>
          <div className="button-stack">
            <button disabled={busy} onClick={() => void exportCurrent()}>
              Export current data
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={() => void restore()}
            >
              {busy ? "Working…" : "Replace current data"}
            </button>
            <button disabled={busy} onClick={() => setIncoming(undefined)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <section>
            <h3>App version</h3>
            <p>Version: {__BUILD_VERSION__} UTC</p>
            <p>
              Last updated:{" "}
              {new Date(__BUILD_TIME__).toLocaleString(undefined, {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </section>
          <section>
            <h3>Calorie summary</h3>
            <label>
              Show in Progress
              <select
                value={calorieView}
                onChange={(e) => {
                  const previous = calorieView;
                  const next = e.target.value as typeof calorieView;
                  setView(next);
                  void setCalorieView?.(next).catch((err) => {
                    setView(previous);
                    setError(err.message);
                  });
                }}
              >
                <option value="daily">Today</option>
                <option value="weekly">Last week average</option>
                <option value="monthly">This month average</option>
              </select>
            </label>
          </section>
          <section>
            <h3>Your records, on this device</h3>
            <p>
              Records stay on this device. Export a backup; browser data can be
              cleared.
            </p>
            <p>
              Safari and the Home Screen app may have separate records. Export
              before switching.
            </p>
            <button
              className="full"
              onClick={() => {
                navigator.storage
                  ?.persist?.()
                  .then((ok) =>
                    setDone(
                      ok
                        ? "Persistent storage granted. This is still not a backup."
                        : "Persistent storage was not granted. Export regularly.",
                    ),
                  )
                  .catch(() =>
                    setDone(
                      "Persistent storage is unavailable here. Export regularly.",
                    ),
                  );
              }}
            >
              Request persistent storage
            </button>
          </section>
          <section>
            <h3>Backup & restore</h3>
            {!data.preferences[0].reminderDismissed && (
              <div className="notice">
                <p>Keep a backup outside this device.</p>
                <button onClick={dismiss}>Dismiss reminder</button>
              </div>
            )}
            <p className="muted">
              Last export created:{" "}
              {data.preferences[0].lastExport
                ? new Date(data.preferences[0].lastExport).toLocaleString()
                : "Never"}
            </p>
            <button
              className="primary full"
              disabled={busy}
              onClick={() => void exportCurrent()}
            >
              Export complete backup
            </button>
            <label>
              Restore a JSON backup
              <input
                disabled={busy}
                type="file"
                accept="application/json,.json"
                onChange={(e) => void pick(e.target.files?.[0])}
              />
            </label>
            <p className="muted">
              Replacement only. Limit: 24 MiB per full backup, 2 MiB per stored
              photo, 40 photos, 4,000 saved records. Images and drafts are
              included.
            </p>
          </section>
          <section>
            <h3>Install on iPhone</h3>
            <p>
              Open your stable HTTPS address in Safari. Tap Share, then Add to
              Home Screen. Keep an export before switching browsers or
              installations.
            </p>
          </section>
          <section>
            <h3>Privacy & capabilities</h3>
            <p>
              Meals, workouts, photos and OCR stay in this browser's IndexedDB.
              No ads, analytics or personal-record uploads. Browser speech may
              use its provider's servers. Hosting providers may retain access
              logs.
            </p>
            <p>
              Startup requires internet access. There is no offline service
              worker. OCR loads bundled English and French resources only when
              requested.
            </p>
          </section>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="notice" role="status">
          {done}
        </p>
      )}
    </Modal>
  );
}
