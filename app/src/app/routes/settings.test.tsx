// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "@/app/router";
import {
  closeProgressDb,
  readAllSlots,
} from "@/features/progress/progressStore";
import { getCredentials } from "@/features/sync/raCredentials";
import { validProgressExport } from "@/testing/helpers";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

async function renderSettings() {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: ["/settings"] }),
  );
  render(<RouterProvider router={router} />);
  await screen.findByText("Progress backup");
}

function importFile(content: string) {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File([content], "progress.json", {
    type: "application/json",
  });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("settings — progress backup (FR-B6)", () => {
  it("imports a valid export file and reports the count", async () => {
    await renderSettings();
    importFile(JSON.stringify(validProgressExport()));
    expect(await screen.findByRole("status")).toBeDefined();
    expect(screen.getByText("Imported progress for 1 guide(s).")).toBeDefined();
    const slots = await readAllSlots();
    expect(slots).toHaveLength(1);
    expect(slots[0]?.guideId).toBe("fictional-quest");
  });

  it("rejects a malformed file with a visible message and writes nothing", async () => {
    await renderSettings();
    importFile('{"kind": "totodile-progress", "slots": "nope"}');
    expect(
      await screen.findByText(/Not a valid TOTODILE progress export/),
    ).toBeDefined();
    expect(await readAllSlots()).toHaveLength(0);
  });

  it("export builds a schema-valid file download", async () => {
    const createObjectURL = vi.fn(() => "blob:totodile");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    await renderSettings();
    fireEvent.click(screen.getByText("Export progress"));
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce());
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:totodile");
  });
});

describe("settings — RA credentials (§17.4)", () => {
  it("saves and clears the RA username + API key", async () => {
    await renderSettings();
    fireEvent.change(screen.getByLabelText("RA username"), {
      target: { value: "Pierre" },
    });
    const keyField = screen.getByLabelText("RA API key");
    expect(keyField).toHaveProperty("type", "password");
    fireEvent.change(keyField, { target: { value: "KEY-123" } });
    fireEvent.click(screen.getByText("Save"));
    expect(getCredentials()).toEqual({
      username: "Pierre",
      webApiKey: "KEY-123",
    });

    fireEvent.click(screen.getByText("Clear"));
    expect(getCredentials()).toBeNull();
  });
});
