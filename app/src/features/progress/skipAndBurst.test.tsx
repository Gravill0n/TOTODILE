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

// Skip and burst are per-step actions, so these drive them inside one visit —
// the play view shows one visit at a time (design v2). Where the pointer ends
// up outside the displayed visit, the stored slot is the assertion.

const GATE = "/chapter/c1/visit/v-castle-gate-1";
const VAULT = "/chapter/c2/visit/v-sunken-vault-1";

// The keyword headlines StepRow renders and labels with.
const S1 = "Talk to gatekeeper ×2 · Take rusty lantern";
const S2 = "Pry Old Coin from loose brick";
const V1 = "Dive at buoy · Swim through cracked grate";
const V2 = "Pull levers west, east, center";
const V3 = "Feed moray eel a mushroom";

const short = (text: string) => text.slice(0, 40);

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeProgressDb();
  await deleteDB("totodile");
});

const currentText = () =>
  document.querySelector("[data-current]")?.textContent ?? "";

const doneBox = (text: string) =>
  screen.getByLabelText(`Done: ${short(text)}`) as HTMLInputElement;

const renderGuide = async (path: string, firstStepText: string) => {
  stubGuideContent();
  renderGuideAt("fictional-quest", path);
  await screen.findByText(firstStepText);
};

describe("skip-for-later (FR-B2)", () => {
  it("skipping the current step advances the pointer and flags the row", async () => {
    await renderGuide(GATE, S1);
    fireEvent.click(screen.getByLabelText(`Skip for later: ${short(S1)}`));
    await waitFor(() => expect(currentText()).toContain(S2));
    expect(screen.getByText("skipped")).toBeDefined();
    expect(doneBox(S1).checked).toBe(false);
  });

  it("checking a skipped step promotes it to done", async () => {
    await renderGuide(GATE, S1);
    fireEvent.click(screen.getByLabelText(`Skip for later: ${short(S1)}`));
    await screen.findByText("skipped");
    fireEvent.click(doneBox(S1));
    await waitFor(() => {
      expect(screen.queryByText("skipped")).toBeNull();
    });
    expect(doneBox(S1).checked).toBe(true);
  });

  it("done rows offer no skip action", async () => {
    await renderGuide(GATE, S1);
    fireEvent.click(doneBox(S1));
    await waitFor(() => expect(currentText()).toContain(S2));
    expect(screen.queryByLabelText(`Skip for later: ${short(S1)}`)).toBeNull();
  });

  it("unskipping a non-current step leaves the pointer alone", async () => {
    await renderGuide(GATE, S1);
    fireEvent.click(screen.getByLabelText(`Skip for later: ${short(S2)}`));
    await screen.findByText("skipped");
    expect(currentText()).toContain(S1);
    fireEvent.click(screen.getByLabelText(`Unskip: ${short(S2)}`));
    await waitFor(() => {
      expect(screen.queryByText("skipped")).toBeNull();
    });
    expect(currentText()).toContain(S1);
  });
});

describe("burst marking (P2)", () => {
  it("mark-through checks everything up to the tapped step but preserves skips", async () => {
    // The pointer sits on the visit's first step, so the burst spans exactly
    // the three steps on screen.
    await writeSlot({
      ...emptySlot("fictional-quest"),
      currentStepId: "fictional-quest:c2:s1",
    });
    await renderGuide(VAULT, V1);

    fireEvent.click(screen.getByLabelText(`Skip for later: ${short(V2)}`));
    await screen.findByText("skipped");
    fireEvent.click(
      screen.getByLabelText(`Mark all through here: ${short(V3)}`),
    );

    // The pointer walks past the burst into the next visit.
    await waitFor(async () => {
      const slot = await readSlot("fictional-quest");
      expect(slot.currentStepId).toBe("fictional-quest:c2:s4");
    });
    expect(doneBox(V1).checked).toBe(true);
    expect(doneBox(V3).checked).toBe(true);
    expect(doneBox(V2).checked).toBe(false);
    expect(screen.getByText("skipped")).toBeDefined();
  });
});
