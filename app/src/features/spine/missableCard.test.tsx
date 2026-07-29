// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  readSlot,
  writeSlot,
} from "@/features/progress/progressStore";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";

// The fixture's first missable: step c1:s2, ahead of the landing step c1:s1 —
// and in the same visit, which is now the condition for showing anything.
const C1S2 = "fictional-quest:c1:s2";
const ACK = /Acknowledge missable: Before opening the gate/;
const GATE = "/chapter/c1/visit/v-castle-gate-1";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("missable card (FR-B5)", () => {
  it("warns at the step itself and persists the acknowledgement", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest");

    expect(await screen.findByText("Missable ahead")).toBeDefined();
    // The deadline is quoted whole — it is the whole point of the warning.
    expect(
      screen.getByText(/Before opening the gate — the courtyard locks/),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: ACK }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: ACK })).toBeNull();
    });
    await waitFor(async () => {
      const slot = await readSlot("fictional-quest");
      expect(slot.acknowledgedMissables).toContain(C1S2);
    });
  });

  it("warns only where the player is, with no sticky banner left over", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText("Missable ahead");
    // The banner used to float over the whole play view; the warning now
    // belongs to a row.
    expect(screen.queryByRole("alert")).toBeNull();
    // The vault's missable is two chapters away and not on this page.
    expect(screen.queryByText(/Before draining the vault/)).toBeNull();
  });

  it("says nothing about a missable already behind the pointer", async () => {
    // Pointer past c1:s2 — the deadline is gone, so is the warning.
    await writeSlot({
      ...emptySlot("fictional-quest"),
      currentStepId: "fictional-quest:c1:s3",
    });
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(/Pry Old Coin/);
    expect(screen.queryByText("Missable ahead")).toBeNull();
  });
});
