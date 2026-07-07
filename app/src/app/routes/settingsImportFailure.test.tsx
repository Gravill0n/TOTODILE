// @vitest-environment jsdom
import "fake-indexeddb/auto";

// Force the import write to fail while keeping the rest of the store real —
// in its own file because vi.mock is module-wide.
vi.mock("@/features/progress/progressStore", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/progress/progressStore")>();
  return {
    ...actual,
    importSlots: vi.fn(async () => {
      throw new Error("quota exceeded");
    }),
  };
});

import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "@/app/router";
import {
  closeProgressDb,
  readAllSlots,
} from "@/features/progress/progressStore";
import { validProgressExport } from "@/testing/helpers";

afterEach(async () => {
  cleanup();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("settings — progress import write failure (§22.4)", () => {
  it("shows an error instead of failing silently when the write throws", async () => {
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/settings"] }),
    );
    render(<RouterProvider router={router} />);
    await screen.findByText("Progress backup");

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(
      [JSON.stringify(validProgressExport())],
      "progress.json",
      { type: "application/json" },
    );
    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await screen.findByText(/Could not write the imported progress/),
    ).toBeDefined();
    expect(await readAllSlots()).toHaveLength(0);
  });
});
