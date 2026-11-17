// @vitest-environment jsdom
import "fake-indexeddb/auto";
import React from "react";
import { Blob as NodeBlob } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
  within,
} from "@testing-library/react";
import { App } from "../src/App";
import { Voice, Scan } from "../src/InputFlows";
import { Settings } from "../src/Settings";
import { JournalDB } from "../src/storage";
import { fixture, freeze, restoreFixture } from "./fixtures";
import { importJSON, exportJSON } from "../src/backup";
import { setClockForTest } from "../src/dates";
Object.assign(globalThis, { Blob: NodeBlob, React });
URL.createObjectURL = vi.fn(() => "blob:test");
URL.revokeObjectURL = vi.fn();
let ocrResolve: (s: string) => void;
vi.mock("../src/ocr", () => ({
  preparePhoto: vi.fn(async () => ({
    blob: new Blob(["photo"], { type: "image/jpeg" }),
    width: 10,
    height: 10,
  })),
  releaseOCR: vi.fn(async () => {}),
  recognize: vi.fn(
    () =>
      new Promise<string>((r) => {
        ocrResolve = r;
      }),
  ),
}));
let db: JournalDB;
beforeEach(async () => {
  freeze();
  db = new JournalDB("ui-" + crypto.randomUUID(), () => {});
  await db.restore(fixture(), 1);
});
afterEach(async () => {
  cleanup();
  await db.close();
  vi.restoreAllMocks();
});
async function mount() {
  render(<App database={db} />);
  await screen.findByRole("heading", { name: "Today", level: 1 });
}
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));
describe("actual screen interactions with persisted IndexedDB", () => {
  it("two-tap favourite, rapid Save, intentional repeat and reload persistence", async () => {
    await mount();
    click("Add Chicken & rice");
    await screen.findByRole("dialog", { name: "Add meal" });
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe(
      "Uncategorised",
    );
    const rapidSave = screen.getByRole("button", { name: "Save meal" });
    fireEvent.click(rapidSave);
    fireEvent.click(rapidSave);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await db.read()).meals).toHaveLength(2);
    click("Add Chicken & rice");
    await screen.findByRole("dialog");
    click("Save meal");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await db.read()).meals).toHaveLength(3);
    cleanup();
    await mount();
    expect(screen.getAllByText("Chicken & rice").length).toBeGreaterThan(1);
  });
  it("retains typed text after close/reload, resumes draft and saves compound lunch", async () => {
    await mount();
    click("Add meal");
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Write a meal"), {
      target: { value: "Apple" },
    });
    click("Close");
    await waitFor(async () =>
      expect((await db.read()).drafts[0].pendingText).toBe("Apple"),
    );
    cleanup();
    await mount();
    click("Resume saved draft");
    await screen.findByRole("dialog");
    expect(
      (screen.getByLabelText("Write a meal") as HTMLInputElement).value,
    ).toBe("Apple");
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Lunch" },
    });
    click("Add Chicken & rice");
    click("Save meal");
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(2));
    const meal = (await db.read()).meals.find(
      (m) => m.id !== "meal-breakfast",
    )!;
    expect(meal.category).toBe("Lunch");
    expect(meal.items.map((i) => i.name)).toEqual(["Chicken & rice", "Apple"]);
    expect((await db.read()).drafts).toHaveLength(0);
  });
  it("selecting days does not write workouts; workout/rest/clear and Undo use real data", async () => {
    await mount();
    click(/November 12, 2026, unlogged/);
    expect((await db.read()).workouts).toHaveLength(5);
    click(/Log workout/);
    await waitFor(async () =>
      expect((await db.read()).workouts).toHaveLength(6),
    );
    click("Day details");
    await screen.findByRole("dialog");
    click("Rest day");
    await waitFor(async () =>
      expect(
        (await db.read()).workouts.find((w) => w.id === "2026-11-12")?.state,
      ).toBe("rest"),
    );
    click("Day details");
    click("Clear record");
    await waitFor(async () =>
      expect((await db.read()).workouts).toHaveLength(5),
    );
    click("Undo");
    await waitFor(async () =>
      expect(
        (await db.read()).workouts.find((w) => w.id === "2026-11-12")?.state,
      ).toBe("rest"),
    );
  });
  it("shared editor edit/copy/delete and undo; no viewing action logs food", async () => {
    await mount();
    click("Eggs on toast");
    await screen.findByRole("dialog");
    click("Edit meal");
    await screen.findByRole("dialog", { name: "Edit meal" });
    expect(screen.queryByLabelText(/Meal title/)).toBeNull();
    expect(screen.queryByLabelText(/^Notes/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Lunch" },
    });
    click("Save meal");
    await waitFor(async () =>
      expect((await db.read()).meals[0].category).toBe("Lunch"),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    click("Eggs on toast");
    await screen.findByRole("dialog");
    click("Copy to a new meal");
    await screen.findByRole("dialog", { name: "Add meal" });
    expect((await db.read()).meals).toHaveLength(1);
    click("Save meal");
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(
      screen.getAllByRole("button", { name: "Eggs on toast" })[0],
    );
    click("Delete meal");
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(1));
    click("Undo");
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(2));
  });
  it("draft conflict resume/discard, third pin choice and pinned search once", async () => {
    await mount();
    click("Add meal");
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Write a meal"), {
      target: { value: "Retain this" },
    });
    click("Close");
    click("Add Chicken & rice");
    await screen.findByRole("dialog", { name: "A meal draft is waiting" });
    click("Resume draft");
    expect(
      (screen.getByLabelText("Write a meal") as HTMLInputElement).value,
    ).toBe("Retain this");
    click("Close");
    click("Add Chicken & rice");
    click("Discard and start new");
    await screen.findByRole("dialog", { name: "Add meal" });
    expect((screen.getByLabelText("Item 1") as HTMLInputElement).value).toBe(
      "Chicken & rice",
    );
    click("Discard draft");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Library" })).toBeTruthy(),
    );
    click("Library");
    await screen.findByRole("heading", { name: "Library" });
    fireEvent.change(screen.getByLabelText("Search saved foods"), {
      target: { value: "Chicken" },
    });
    expect(
      screen.getAllByRole("button", { name: "Chicken & rice Favourite" }),
    ).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Search saved foods"), {
      target: { value: "" },
    });
    click("Apple Saved food");
    click("Pin to Today");
    await screen.findByRole("dialog", { name: "Choose a tile to replace" });
    click("Yogurt & berries");
    await waitFor(async () =>
      expect((await db.read()).preferences[0].pins).toEqual([
        "food-0",
        "food-4",
      ]),
    );
  });
  it("failed draft transaction keeps local input and Save retries successfully", async () => {
    await mount();
    db.faultForTest = true;
    click("Add meal");
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Write a meal"), {
      target: { value: "Recover me" },
    });
    await screen.findByText(/Simulated storage failure/);
    db.faultForTest = false;
    click("Save meal");
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(2));
    expect(
      (await db.read()).meals.find((m) => m.id !== "meal-breakfast")?.items[0]
        .name,
    ).toBe("Recover me");
  });
  it("progress calendar agrees with baseline and month navigation clears selected day", async () => {
    await mount();
    click("Progress");
    await screen.findByRole("heading", { name: "Progress" });
    expect(
      screen.getByRole("button", {
        name: /November 15, 2026, unlogged, has meals/,
      }),
    ).toBeTruthy();
    expect(screen.getByText("workout days").textContent).toContain("3");
    expect(screen.getByText("days with meals").textContent).toContain("1");
    click("Previous month");
    expect(screen.getByRole("heading", { name: "Meal history" })).toBeTruthy();
    expect(screen.getByText("No records yet.")).toBeTruthy();
  });
});
describe("reviewed input and restore controls; platform services are test doubles", () => {
  it("voice alias selection is visible and required; transcript fallback and cancellation ignore late results", async () => {
    let recognition: any;
    class Speech {
      onresult: any;
      onerror: any;
      onend: any;
      abort = vi.fn();
      start = vi.fn();
      constructor() {
        recognition = this;
      }
    }
    Object.assign(window, { SpeechRecognition: Speech });
    const use = vi.fn(),
      close = vi.fn();
    render(
      <Voice
        foods={fixture().foods}
        consent={true}
        acceptConsent={async () => {}}
        close={close}
        use={use}
      />,
    );
    click("Start browser speech");
    act(() =>
      recognition.onresult({ results: [[{ transcript: "Chicken and rice" }]] }),
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Use this food",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("radio"));
    expect(screen.getByText(/Selected/)).toBeTruthy();
    click("Use this food");
    expect(use).toHaveBeenCalledTimes(1);
    const prior = recognition.onresult;
    click("Close");
    act(() => prior({ results: [[{ transcript: "Late result" }]] }));
    expect(
      (screen.getByLabelText("Transcript") as HTMLTextAreaElement).value,
    ).toBe("Chicken and rice");
    expect(use).toHaveBeenCalledTimes(1);
    delete (window as any).SpeechRecognition;
  });
  it("speech permission denial and unavailable API retain ordinary editable text", async () => {
    let r: any;
    class Speech {
      onerror: any;
      abort = vi.fn();
      start = vi.fn();
      constructor() {
        r = this;
      }
    }
    Object.assign(window, { SpeechRecognition: Speech });
    render(
      <Voice
        foods={fixture().foods}
        consent={false}
        acceptConsent={async () => {}}
        close={() => {}}
        use={() => {}}
      />,
    );
    click("Start browser speech");
    await act(async () => {});
    act(() => r.onerror({ error: "not-allowed" }));
    expect(screen.getByText(/permission denied/)).toBeTruthy();
    cleanup();
    delete (window as any).SpeechRecognition;
    render(
      <Voice
        foods={[]}
        consent={false}
        acceptConsent={async () => {}}
        close={() => {}}
        use={() => {}}
      />,
    );
    expect(
      screen.getByText("Direct browser speech is unavailable here."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Transcript"), {
      target: { value: "Plain text" },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Use transcript",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("OCR remains unreviewed, edits reset confirmation, stale response cannot overwrite text; label never logs", async () => {
    const save = vi.fn(async (f: any) => f);
    render(
      <Scan
        foods={fixture().foods}
        target={fixture().foods[3]}
        close={() => {}}
        save={save}
        add={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("Camera or photo"), {
      target: { files: [new File(["x"], "label.jpg", { type: "image/jpeg" })] },
    });
    await screen.findByAltText(
      "Selected label. Check readability before scanning.",
    );
    await act(async () => {
      ocrResolve("Nutrition Facts\nPer 175 g\nProtein 12 g");
    });
    expect(
      (screen.getByRole("button", { name: "Save label" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByLabelText("I reviewed this text"));
    expect(
      (screen.getByRole("button", { name: "Save label" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    fireEvent.change(screen.getByLabelText(/Label text/), {
      target: { value: "Corrected text" },
    });
    expect(
      (screen.getByLabelText("I reviewed this text") as HTMLInputElement)
        .checked,
    ).toBe(false);
    click("Extract label text");
    const delayed = ocrResolve;
    click("Cancel scan");
    fireEvent.change(screen.getByLabelText(/Label text/), {
      target: { value: "Keep newer text" },
    });
    await act(async () => delayed("Late OCR"));
    expect(
      (screen.getByLabelText(/Label text/) as HTMLTextAreaElement).value,
    ).toBe("Keep newer text");
    fireEvent.click(screen.getByLabelText("I reviewed this text"));
    click("Save label");
    await screen.findByText(/No meal was logged/);
    expect(save).toHaveBeenCalledTimes(1);
    expect((await db.read()).meals).toHaveLength(1);
  });
  it("restore review counts parsed contents, export and Cancel preserve database, replacement requires its own click", async () => {
    const incoming = restoreFixture();
    const json = await exportJSON(incoming);
    const parsed = await importJSON(json, async () => ({
      width: 1,
      height: 1,
    }));
    const replace = vi.fn(async (d) => {
      await db.restore(d, 2);
    });
    const decode = vi
      .spyOn(globalThis, "Image")
      .mockImplementation(function () {
        return {
          naturalWidth: 1,
          naturalHeight: 1,
          onload: null as any,
          onerror: null as any,
          set src(value: string) {
            queueMicrotask(() => this.onload?.());
          },
        } as any;
      } as any);
    const exported = vi.fn(async () => {});
    const anchor = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(
      <Settings
        data={await db.read()}
        close={() => {}}
        exported={exported}
        replace={replace}
        dismiss={() => {}}
      />,
    );
    const file = { size: json.length, text: async () => json };
    fireEvent.change(screen.getByLabelText("Restore a JSON backup"), {
      target: { files: [file] },
    });
    await screen.findByRole("dialog", { name: "Review restore" });
    expect(screen.getByText("24 meal entries")).toBeTruthy();
    expect(screen.getByText("7 saved foods")).toBeTruthy();
    expect(screen.getByText("4 photos")).toBeTruthy();
    click("Export current data");
    await waitFor(() => expect(exported).toHaveBeenCalledTimes(1));
    expect(replace).not.toHaveBeenCalled();
    expect((await db.read()).meals).toHaveLength(1);
    click("Cancel");
    expect((await db.read()).meals).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Restore a JSON backup"), {
      target: { files: [file] },
    });
    await screen.findByRole("dialog", { name: "Review restore" });
    click("Replace current data");
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect((await db.read()).meals).toHaveLength(parsed.meals.length);
    decode.mockRestore();
    anchor.mockRestore();
  });
});
