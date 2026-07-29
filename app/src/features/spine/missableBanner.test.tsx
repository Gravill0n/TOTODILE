// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb, readSlot } from "@/features/progress/progressStore";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";

// The fixture's first missable: step c1:s2, ahead of the landing step c1:s1.
const C1S2 = "fictional-quest:c1:s2";
const ACK = /Acknowledge missable: Before opening the gate/;

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("missable banner (FR-B5)", () => {
  it("warns about an upcoming missable and persists the acknowledgement", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest");

    expect(await screen.findByLabelText("Upcoming missables")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: ACK }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: ACK })).toBeNull();
    });
    await waitFor(async () => {
      const slot = await readSlot("fictional-quest");
      expect(slot.acknowledgedMissables).toContain(C1S2);
    });
  });
});
