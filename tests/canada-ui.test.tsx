// @vitest-environment jsdom
import "fake-indexeddb/auto";
import React from "react";
import { Blob as NodeBlob } from "node:buffer";
import { it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { App } from "../src/App";
import { JournalDB } from "../src/storage";
import { freeze } from "./fixtures";
Object.assign(globalThis, { Blob: NodeBlob, React });
URL.createObjectURL = vi.fn(() => "blob:test");
URL.revokeObjectURL = vi.fn();
it("logs Canadian garlic naan by its documented piece, and retains a dated snapshot through reload", async () => {
  freeze();
  const db = new JournalDB("canada-" + crypto.randomUUID(), () => {});
  try {
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Search common foods"), {
      target: { value: "garlic naan" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Add Canadian Indian, bread, naan, garlic (includes roasted onion)",
      }),
    );
    fireEvent.change(screen.getByLabelText("Canadian portion"), {
      target: { value: "1 piece" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save meal" }));
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(1));
    const item = (await db.read()).meals[0].items[0];
    expect(item.calorie?.calories).toBeCloseTo(
      (288.462120365 * 100.0667763) / 100,
      8,
    );
    expect(item.calorie?.source).toContain(
      "Canadian Nutrient File 2026, food 7912",
    );
    const { exportJSON, importJSON } = await import("../src/backup");
    const restored = await importJSON(await exportJSON(await db.read()));
    expect(restored.meals[0].items[0].calorie).toEqual(item.calorie);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText("Calories: 289 kcal")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(screen.getByText(/Today: 289 kcal/)).toBeTruthy();
    cleanup();
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    expect(screen.queryByText("Calories: 289 kcal")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(screen.getByText(/Today: 289 kcal/)).toBeTruthy();
  } finally {
    cleanup();
    await db.close();
  }
});
it("shows source age and package-label guidance for Canadian branded foods", async () => {
  freeze();
  const db = new JournalDB("canada-label-" + crypto.randomUUID(), () => {});
  try {
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Search common foods"), {
      target: { value: "froot loops" },
    });
    expect(screen.getByText(/energy updated 2012-01-19/)).toBeTruthy();
    expect(
      screen.getByText(/use your package label when available/),
    ).toBeTruthy();
  } finally {
    cleanup();
    await db.close();
  }
});
