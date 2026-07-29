// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  writeSlot,
} from "@/features/progress/progressStore";
import { validRaMapping } from "@/testing/helpers";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";

// The bar across the top of the play view answers "how am I doing" without
// leaving the visit — the two numbers a completionist tracks, and the way out.

const S1_TEXT = /Talk to gatekeeper ×2/;

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("guide header", () => {
  it("carries the way back, the title and both totals", async () => {
    // 2 of the fixture's 10 steps done, one of them an RA target.
    await writeSlot({
      ...emptySlot("fictional-quest"),
      itemStates: {
        "fictional-quest:c1:s1": { state: "done", at: "2026-07-29T10:00:00Z" },
        "fictional-quest:c1:s2": { state: "done", at: "2026-07-29T10:00:00Z" },
      },
    });
    stubGuideContent({ raMappings: { "fictional-quest": validRaMapping() } });
    renderGuideAt("fictional-quest");
    await screen.findByText(S1_TEXT);

    const back = screen.getByRole("link", { name: /Library/ });
    expect(back.getAttribute("href")).toBe("/");
    expect(
      screen.getByRole("heading", { name: "Fictional Quest — 100% guide" }),
    ).toBeDefined();

    expect(screen.getByText("2 / 10")).toBeDefined();
    expect(screen.getByText("20%")).toBeDefined();
    // Mastery off the loaded ra-mapping: one of two targets is done.
    expect(screen.getByText("1 / 2")).toBeDefined();
  });

  it("counts steps only — widget items are not spine progress", async () => {
    await writeSlot({
      ...emptySlot("fictional-quest"),
      itemStates: {
        // A checklist row, not a step.
        "fictional-quest:treasure:gate-key": {
          state: "done",
          at: "2026-07-29T10:00:00Z",
        },
      },
    });
    stubGuideContent();
    renderGuideAt("fictional-quest");
    await screen.findByText(S1_TEXT);
    expect(screen.getByText("0 / 10")).toBeDefined();
  });

  it("says so when the guide has no RA set to master", async () => {
    stubGuideContent({ raMappings: {} });
    renderGuideAt("fictional-quest");
    await screen.findByText(S1_TEXT);
    expect(screen.getByText("no RA set")).toBeDefined();
  });
});
