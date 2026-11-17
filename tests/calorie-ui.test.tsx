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
it("logs USDA egg using a documented large portion, displays calories, and survives reload", async () => {
  freeze();
  const db = new JournalDB("calui-" + crypto.randomUUID(), () => {});
  try {
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Search common foods"), {
      target: { value: "Egg, whole, raw, fresh" },
    });
    expect(screen.getByText(/72 kcal per large/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Add USDA Egg, whole, raw, fresh" }),
    );
    fireEvent.change(screen.getByLabelText("USDA portion"), {
      target: { value: "large" },
    });
    expect(screen.getByText(/72 kcal \(71.5 kcal per 1 large\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save meal" }));
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(1));
    const meal = (await db.read()).meals[0];
    expect(meal.items[0].calorie?.calories).toBe(71.5);
    expect(meal.items[0].calorie?.source).toContain("50 g per large");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText("Calories: 72 kcal")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(screen.getByText(/Today: 72 kcal/)).toBeTruthy();
    cleanup();
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    expect(screen.queryByText("Calories: 72 kcal")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Progress" }));
    expect(screen.getByText(/Today: 72 kcal/)).toBeTruthy();
  } finally {
    cleanup();
    await db.close();
  }
});
it("retains the serving basis when a calorie value is temporarily cleared and re-entered", async () => {
  freeze();
  const db = new JournalDB("calclear-" + crypto.randomUUID(), () => {});
  try {
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Search common foods"), {
      target: { value: "Egg, whole, raw, fresh" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Add USDA Egg, whole, raw, fresh" }),
    );
    fireEvent.change(screen.getByLabelText("USDA portion"), {
      target: { value: "grams" },
    });
    fireEvent.change(screen.getByLabelText("Calories per serving"), {
      target: { value: "" },
    });
    expect(
      (screen.getByRole("button", { name: "Save meal" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("Calories per serving"), {
      target: { value: "150" },
    });
    expect(
      (screen.getByLabelText("Quantity (g)") as HTMLInputElement).value,
    ).toBe("100");
    fireEvent.change(screen.getByLabelText("Quantity (g)"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save meal" }));
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(1));
    const c = (await db.read()).meals[0].items[0].calorie!;
    expect(c.basisQuantity).toBe(100);
    expect(c.unit).toBe("g");
    expect(c.quantity).toBe(150);
    expect(c.calories).toBe(150);
  } finally {
    cleanup();
    await db.close();
  }
});
it("editing a reusable recipe recalculates its servings without mutating prior snapshots", async () => {
  freeze();
  const db = new JournalDB("calrecipe-" + crypto.randomUUID(), () => {});
  try {
    const { base } = await import("../src/types");
    const ingredient = {
      name: "Egg",
      calorie: {
        calories: 143,
        basisQuantity: 100,
        quantity: 100,
        unit: "g",
        source: "USDA FDC 171287",
      },
    };
    const recipe = {
      ...base("recipe-1"),
      name: "Egg recipe",
      favourite: false,
      archived: false,
      recipe: { items: [ingredient], servings: 2 },
      calorie: {
        calories: 71.5,
        basisQuantity: 1,
        quantity: 1,
        unit: "serving",
        source: "Recipe calculated from saved ingredient values",
      },
    };
    await db.putRecord("foods", recipe, 0, 1);
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Egg recipe Saved food" })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Add to meal" }));
    await screen.findByRole("dialog", { name: "Add meal" });
    fireEvent.click(screen.getByRole("button", { name: "Save meal" }));
    await waitFor(async () => expect((await db.read()).meals).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Egg recipe Saved food" })[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.change(screen.getByLabelText("Recipe servings"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save food" }));
    await waitFor(async () =>
      expect((await db.read()).foods[0].recipe?.servings).toBe(4),
    );
    const d = await db.read();
    expect(d.foods[0].calorie?.calories).toBe(35.75);
    expect(d.meals[0].items[0].calorie?.calories).toBe(71.5);
  } finally {
    cleanup();
    await db.close();
  }
});
