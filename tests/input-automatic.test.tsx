// @vitest-environment jsdom
import "fake-indexeddb/auto";
import React from "react";
import { Blob as NodeBlob } from "node:buffer";
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
import { App } from "../src/App";
import { Voice, Scan } from "../src/InputFlows";
import { JournalDB } from "../src/storage";
import { fixture, freeze } from "./fixtures";
Object.assign(globalThis, { Blob: NodeBlob, React });
URL.createObjectURL = vi.fn(() => "blob:test");
URL.revokeObjectURL = vi.fn();
let finish: (value: string) => void;
vi.mock("../src/ocr", () => ({
  preparePhoto: vi.fn(async () => ({
    blob: new Blob(["sample"], { type: "image/jpeg" }),
    width: 10,
    height: 10,
  })),
  releaseOCR: vi.fn(async () => {}),
  recognize: vi.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  ),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as any).SpeechRecognition;
  finish = undefined as unknown as (value: string) => void;
});
const mode = () =>
  fireEvent.click(screen.getByRole("button", { name: /Input mode: manual/ }));
it("automatically adds one unambiguous saved food and ignores duplicate or late voice callbacks", async () => {
  let recognition: any;
  class FakeSpeech {
    onresult: any;
    onerror: any;
    onend: any;
    abort = vi.fn();
    start = vi.fn();
    constructor() {
      recognition = this;
    }
  }
  Object.assign(window, { SpeechRecognition: FakeSpeech });
  const use = vi.fn();
  render(
    <Voice
      foods={fixture().foods}
      consent={true}
      acceptConsent={async () => {}}
      close={() => {}}
      use={use}
    />,
  );
  mode();
  fireEvent.click(screen.getByRole("button", { name: "Start browser speech" }));
  const callback = recognition.onresult;
  act(() => {
    for (let i = 0; i < 100; i++)
      callback({ results: [[{ transcript: "Chicken and rice" }]] });
  });
  expect(use).toHaveBeenCalledTimes(1);
  expect(use.mock.calls[0][0]).toMatchObject({
    name: "Chicken & rice",
    sourceId: "food-0",
  });
});
it("automatic scan persists the label and photo in the draft without saving a meal", async () => {
  freeze();
  const db = new JournalDB("autoscan-" + crypto.randomUUID(), () => {});
  try {
    await db.restore(fixture(), 1);
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Scan label" }));
    mode();
    fireEvent.change(screen.getByLabelText("Camera or photo"), {
      target: { files: [new File(["x"], "label.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    await act(async () =>
      finish("Nutrition Facts\nPer 100 g\nCalories 150\nProtein 12 g"),
    );
    await screen.findByRole("dialog", { name: "Add meal" });
    await waitFor(async () =>
      expect((await db.read()).drafts[0].items).toHaveLength(1),
    );
    const data = await db.read();
    expect(data.meals).toHaveLength(1);
    expect(data.images).toHaveLength(1);
    expect(data.images[0].blob.size).toBe(6);
    const { exportJSON, importJSON } = await import("../src/backup");
    const restored = await importJSON(await exportJSON(data), async () => ({
      width: 10,
      height: 10,
    }));
    expect(restored.drafts[0].items[0].label?.imageId).toBe(
      restored.images[0].id,
    );
    expect(restored.preferences[0].scanMode).toBe("automatic");
    expect(data.drafts[0].items[0]).toMatchObject({
      name: "Scanned food",
      calorie: { calories: 150, basisQuantity: 100, quantity: 100, unit: "g" },
      label: { reviewed: false, imageId: data.images[0].id },
    });
  } finally {
    cleanup();
    await db.close();
  }
});
it("cancelling an automatic scan ignores a delayed result", async () => {
  const autoUse = vi.fn(async () => {}),
    close = vi.fn();
  render(
    <Scan
      foods={[]}
      close={close}
      save={async (f) => f}
      add={() => {}}
      autoUse={autoUse}
    />,
  );
  mode();
  fireEvent.change(screen.getByLabelText("Camera or photo"), {
    target: { files: [new File(["x"], "label.jpg", { type: "image/jpeg" })] },
  });
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  const late = finish;
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await act(async () => late("Per 100 g\nCalories 150"));
  expect(autoUse).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
});
it("automatic scan failures keep the extracted text available for manual review", async () => {
  const autoUse = vi.fn(async () => {
    throw Error("Storage unavailable");
  });
  render(
    <Scan
      foods={[]}
      close={() => {}}
      save={async (f) => f}
      add={() => {}}
      autoUse={autoUse}
    />,
  );
  mode();
  fireEvent.change(screen.getByLabelText("Camera or photo"), {
    target: { files: [new File(["x"], "label.jpg", { type: "image/jpeg" })] },
  });
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  await act(async () => finish("Per 100 g\nCalories 150"));
  await screen.findByText("Storage unavailable");
  expect(
    (screen.getByLabelText(/Label text/) as HTMLTextAreaElement).value,
  ).toContain("Calories 150");
  expect(
    screen.getByAltText("Selected label. Check readability before scanning."),
  ).toBeTruthy();
});
it("switching to manual during scanning keeps the OCR result for review", async () => {
  const autoUse = vi.fn(async () => {});
  render(
    <Scan
      foods={[]}
      close={() => {}}
      save={async (f) => f}
      add={() => {}}
      autoUse={autoUse}
    />,
  );
  mode();
  fireEvent.change(screen.getByLabelText("Camera or photo"), {
    target: { files: [new File(["x"], "label.jpg", { type: "image/jpeg" })] },
  });
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  fireEvent.click(
    screen.getByRole("button", { name: /Input mode: automatic/ }),
  );
  await act(async () => finish("Per 100 g\nCalories 150"));
  expect(autoUse).not.toHaveBeenCalled();
  expect(
    (screen.getByLabelText(/Label text/) as HTMLTextAreaElement).value,
  ).toContain("Calories 150");
  expect(
    (screen.getByLabelText("I reviewed this text") as HTMLInputElement).checked,
  ).toBe(false);
});
it("ambiguous voice matches are returned as plain text rather than guessing a saved food", async () => {
  let recognition: any;
  class FakeSpeech {
    onresult: any;
    onerror: any;
    onend: any;
    abort = vi.fn();
    start = vi.fn();
    constructor() {
      recognition = this;
    }
  }
  Object.assign(window, { SpeechRecognition: FakeSpeech });
  const foods = fixture().foods;
  foods[1].aliases = ["Chicken and rice"];
  const use = vi.fn();
  render(
    <Voice
      foods={foods}
      consent={true}
      acceptConsent={async () => {}}
      close={() => {}}
      use={use}
    />,
  );
  mode();
  fireEvent.click(screen.getByRole("button", { name: "Start browser speech" }));
  act(() =>
    recognition.onresult({ results: [[{ transcript: "Chicken and rice" }]] }),
  );
  expect(use).toHaveBeenCalledOnce();
  expect(use.mock.calls[0][0]).toEqual({ name: "Chicken and rice" });
});
it("closing voice while permission setup is pending never starts recognition", async () => {
  let resolveConsent!: () => void;
  const consent = new Promise<void>((r) => {
    resolveConsent = r;
  });
  const start = vi.fn();
  class FakeSpeech {
    start = start;
    abort = vi.fn();
  }
  Object.assign(window, { SpeechRecognition: FakeSpeech });
  const close = vi.fn();
  render(
    <Voice
      foods={[]}
      consent={false}
      acceptConsent={() => consent}
      close={close}
      use={() => {}}
    />,
  );
  mode();
  fireEvent.click(screen.getByRole("button", { name: "Start browser speech" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await act(async () => resolveConsent());
  expect(start).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledOnce();
});
it("remembers separate voice and scan mode choices on the device", async () => {
  freeze();
  const db = new JournalDB("modes-" + crypto.randomUUID(), () => {});
  try {
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    mode();
    await waitFor(async () =>
      expect((await db.read()).preferences[0].voiceMode).toBe("automatic"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Voice" }));
    expect(
      screen.getByRole("button", { name: /Input mode: automatic/ }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Scan label" }));
    expect(
      screen.getByRole("button", { name: /Input mode: manual/ }),
    ).toBeTruthy();
    mode();
    await waitFor(async () =>
      expect((await db.read()).preferences[0].scanMode).toBe("automatic"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Scan label" }));
    expect(
      screen.getByRole("button", { name: /Input mode: automatic/ }),
    ).toBeTruthy();
  } finally {
    cleanup();
    await db.close();
  }
});
it("ignores a result delivered after speech has ended", () => {
  let recognition: any;
  class FakeSpeech {
    onresult: any;
    onerror: any;
    onend: any;
    abort = vi.fn();
    start = vi.fn();
    constructor() {
      recognition = this;
    }
  }
  Object.assign(window, { SpeechRecognition: FakeSpeech });
  const use = vi.fn();
  render(
    <Voice
      foods={fixture().foods}
      consent={true}
      acceptConsent={async () => {}}
      close={() => {}}
      use={use}
      initialMode="automatic"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Start browser speech" }));
  act(() => {
    recognition.onend();
    recognition.onresult({ results: [[{ transcript: "Chicken and rice" }]] });
  });
  expect(use).not.toHaveBeenCalled();
});
it("does not use a malformed speech result and accepts a later valid result", () => {
  let recognition: any;
  class FakeSpeech {
    onresult: any;
    onerror: any;
    onend: any;
    abort = vi.fn();
    start = vi.fn();
    constructor() {
      recognition = this;
    }
  }
  Object.assign(window, { SpeechRecognition: FakeSpeech });
  const use = vi.fn();
  render(
    <Voice
      foods={fixture().foods}
      consent={true}
      acceptConsent={async () => {}}
      close={() => {}}
      use={use}
      initialMode="automatic"
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Start browser speech" }));
  act(() => recognition.onresult({ results: [null, [], [{}]] }));
  expect(use).not.toHaveBeenCalled();
  act(() =>
    recognition.onresult({ results: [[{ transcript: "Chicken and rice" }]] }),
  );
  expect(use).toHaveBeenCalledTimes(1);
});
it("ignores an old scan when another photo replaces it", async () => {
  const autoUse = vi.fn(async () => {});
  render(
    <Scan
      foods={[]}
      close={() => {}}
      save={async (f) => f}
      add={() => {}}
      autoUse={autoUse}
      initialMode="automatic"
    />,
  );
  const input = screen.getByLabelText("Camera or photo");
  fireEvent.change(input, {
    target: { files: [new File(["a"], "a.jpg", { type: "image/jpeg" })] },
  });
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  const oldResult = finish;
  fireEvent.change(input, {
    target: { files: [new File(["b"], "b.jpg", { type: "image/jpeg" })] },
  });
  await waitFor(() => expect(finish).not.toBe(oldResult));
  await act(async () => oldResult("Per 100 g\nCalories 999"));
  expect(autoUse).not.toHaveBeenCalled();
  await act(async () => finish("Per 100 g\nCalories 150"));
  expect(autoUse).toHaveBeenCalledTimes(1);
  expect(autoUse.mock.calls[0][0].calorie.calories).toBe(150);
});
it("stores an ambiguous scan as unknown calories, not a guessed value", async () => {
  freeze();
  const db = new JournalDB("scan-ambiguous-" + crypto.randomUUID(), () => {});
  try {
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Scan label" }));
    mode();
    fireEvent.change(screen.getByLabelText("Camera or photo"), {
      target: { files: [new File(["x"], "label.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    await act(async () => finish("Per 100 g\nCalories 150 300"));
    await screen.findByRole("dialog", { name: "Add meal" });
    await waitFor(async () =>
      expect((await db.read()).drafts[0].items).toHaveLength(1),
    );
    expect((await db.read()).drafts[0].items[0].calorie).toBeUndefined();
    expect((await db.read()).drafts[0].items[0].label?.text).toContain(
      "150 300",
    );
  } finally {
    cleanup();
    await db.close();
  }
});
