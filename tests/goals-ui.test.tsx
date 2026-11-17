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
import { base, emptyData } from "../src/types";
import { freeze } from "./fixtures";
Object.assign(globalThis, { Blob: NodeBlob, React });
URL.createObjectURL = vi.fn(() => "blob:test");
URL.revokeObjectURL = vi.fn();
it("keeps totals on Progress and lets the user switch goal direction without losing meals", async () => {
  freeze();
  const db = new JournalDB("goals-ui-" + crypto.randomUUID(), () => {});
  try {
    const d = emptyData();
    const calorie = {
      calories: 500,
      basisQuantity: 1,
      quantity: 1,
      unit: "serving",
      source: "test",
    };
    d.meals = [
      {
        ...base("today"),
        date: "2026-11-15",
        category: "Lunch",
        items: [{ name: "Lunch", calorie }],
      },
      {
        ...base("last"),
        date: "2026-11-05",
        category: "Lunch",
        items: [{ name: "Lunch", calorie }],
      },
    ];
    await db.restore(d, 1);
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    expect(screen.queryByText(/Calories: 500 kcal/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(screen.getByText(/Today: 500 kcal/)).toBeTruthy();
    expect(screen.getByText(/Last week.*500 kcal\/day/)).toBeTruthy();
    expect(screen.getByText(/This month.*500 kcal\/day/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Daily calorie goal"), {
      target: { value: "600" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save goal" }));
    await waitFor(async () =>
      expect((await db.read()).preferences[0].calorieGoals?.[0].target).toBe(
        600,
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: /November 15, 2026.*calorie goal met/,
        }),
      ).toBeTruthy(),
    );
    fireEvent.change(screen.getByLabelText("Goal is met when calories are"), {
      target: { value: "at_or_above" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save goal" }));
    await waitFor(async () =>
      expect((await db.read()).preferences[0].calorieGoals?.[0].direction).toBe(
        "at_or_above",
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: /November 15, 2026.*calorie goal not met/,
        }),
      ).toBeTruthy(),
    );
    expect((await db.read()).meals).toHaveLength(2);
    cleanup();
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(
      (
        screen.getByLabelText(
          "Goal is met when calories are",
        ) as HTMLSelectElement
      ).value,
    ).toBe("at_or_above");
  } finally {
    cleanup();
    await db.close();
  }
});
it("hides the old meal-title and notes controls while preserving existing saved text during edits", async () => {
  freeze();
  const db = new JournalDB("legacy-fields-" + crypto.randomUUID(), () => {});
  try {
    const d = emptyData();
    d.meals = [
      {
        ...base("legacy"),
        date: "2026-11-15",
        category: "Breakfast",
        title: "Old title",
        notes: "Keep this note",
        items: [{ name: "Egg" }],
      },
    ];
    await db.restore(d, 1);
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Old title Egg" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit meal" }));
    await screen.findByRole("dialog", { name: "Edit meal" });
    expect(screen.queryByLabelText(/Meal title/)).toBeNull();
    expect(screen.queryByLabelText(/^Notes/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Lunch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save meal" }));
    await waitFor(async () =>
      expect((await db.read()).meals[0].category).toBe("Lunch"),
    );
    expect((await db.read()).meals[0].title).toBe("Old title");
    expect((await db.read()).meals[0].notes).toBe("Keep this note");
  } finally {
    cleanup();
    await db.close();
  }
});
