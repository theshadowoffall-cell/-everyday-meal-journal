// @vitest-environment jsdom
import "fake-indexeddb/auto";
import React from "react";
import { it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { FoodDetails } from "../src/FoodDetails";
import { exportJSON, importJSON } from "../src/backup";
import { fixture } from "./fixtures";

it("simplifies food editing while preserving aliases and previously saved details", async () => {
  const food = { ...fixture().foods[0], type: "Lunch", notes: "Keep my note" };
  const save = vi.fn(async () => {});
  render(
    <FoodDetails
      food={food}
      pins={[]}
      urls={{}}
      close={() => {}}
      save={save}
      add={() => {}}
      togglePin={() => {}}
      scan={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
  expect(screen.getByLabelText(/Aliases/)).toBeTruthy();
  expect(screen.queryByLabelText(/^Type/)).toBeNull();
  expect(screen.queryByLabelText(/^Notes/)).toBeNull();
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Lunch renamed" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save food" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0]).toMatchObject({
    name: "Lunch renamed",
    type: "Lunch",
    notes: "Keep my note",
    aliases: ["Chicken and rice"],
  });
  cleanup();
});

it("preserves the chosen calorie summary in backups and rejects invalid values", async () => {
  const data = fixture();
  data.preferences[0].calorieView = "monthly";
  const backup = await exportJSON(data);
  expect((await importJSON(backup)).preferences[0].calorieView).toBe("monthly");
  const malformed = JSON.parse(backup);
  malformed.data.preferences[0].calorieView = "yearly";
  await expect(importJSON(JSON.stringify(malformed))).rejects.toThrow();
});
