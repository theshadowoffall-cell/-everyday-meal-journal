// @vitest-environment jsdom
import "fake-indexeddb/auto";
import React from "react";
import { Blob as NodeBlob } from "node:buffer";
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { App } from "../src/App";
import { JournalDB } from "../src/storage";
import { base, emptyData } from "../src/types";
import { freeze } from "./fixtures";
Object.assign(globalThis, { Blob: NodeBlob, React });
URL.createObjectURL = vi.fn(() => "blob:test");
URL.revokeObjectURL = vi.fn();
it("ranks plain saved eggs before a sandwich in both Library and the meal editor", async () => {
  freeze();
  const db = new JournalDB("rank-ui-" + crypto.randomUUID(), () => {});
  try {
    const d = emptyData();
    d.foods = ["Burger King egg sandwich", "Egg", "Egg, whole, cooked"].map(
      (name, i) => ({
        ...base(`food-${i}`),
        name,
        favourite: false,
        archived: false,
      }),
    );
    await db.restore(d, 1);
    render(<App database={db} />);
    await screen.findByRole("heading", { name: "Today" });
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    fireEvent.change(screen.getByLabelText("Search saved foods"), {
      target: { value: "egg" },
    });
    const lib = Array.from(document.querySelectorAll(".library-details")).map(
      (el) => el.textContent?.replace("Saved food", "").trim(),
    );
    expect(lib).toEqual([
      "Egg",
      "Egg, whole, cooked",
      "Burger King egg sandwich",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Add meal" }));
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Saved foods"), {
      target: { value: "egg" },
    });
    const picker = Array.from(
      document.querySelectorAll(".picker-row > button.grow"),
    ).map((el) => el.textContent?.trim());
    expect(picker).toEqual([
      "Egg",
      "Egg, whole, cooked",
      "Burger King egg sandwich",
    ]);
  } finally {
    cleanup();
    await db.close();
  }
});
