// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readGuideUi, writeGuideUi } from "@/features/progress/guideUiStore";
import { closeProgressDb } from "@/features/progress/progressStore";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";

// 248px of chapter rail is generous for zelda-oot's 26-character titles and
// cramped for pokemon-crystal's 48. Who decides is the reader now, and the
// decision is remembered per guide.

const S1_TEXT = /Talk to gatekeeper/;
const GATE = "/chapter/c1/visit/v-castle-gate-1";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeProgressDb();
  await deleteDB("totodile");
});

const renderGuide = async (slug = "fictional-quest") => {
  stubGuideContent();
  renderGuideAt(slug, GATE);
  await screen.findByText(S1_TEXT);
};

// Two between the columns, one inside the right rail (map over widgets).
const separators = () => screen.getAllByRole("separator");

describe("resizable rails", () => {
  it("gives every division a separator the keyboard can reach", async () => {
    await renderGuide();
    expect(separators()).toHaveLength(3);
    for (const handle of separators()) {
      // Focusable, and it says which way it moves — the two things a reader
      // driving this from the keyboard depends on.
      expect(handle.getAttribute("tabindex")).not.toBeNull();
      expect(handle.getAttribute("aria-orientation")).toMatch(
        /horizontal|vertical/,
      );
    }
    // The nested one divides top from bottom, so it reads as horizontal.
    expect(
      separators().map((h) => h.getAttribute("aria-orientation")),
    ).toContain("horizontal");
  });

  it("divides the window by the percentages it is handed", async () => {
    await renderGuide();
    // The group turns its layout into a flex ratio per panel. This is the
    // default (18/57/25) because the stored record has not arrived on first
    // paint — what it proves is that the percentages reach the DOM at all.
    const left = screen.getByLabelText("Chapters").closest("[data-slot]");
    expect(left?.getAttribute("style") ?? "").toContain("flex: 18");
  });

  it("keeps one guide's sizes out of another's", async () => {
    await writeGuideUi({
      ...(await readGuideUi("fictional-quest")),
      leftRailPct: 32,
    });
    // A guide never resized still opens at the default.
    expect((await readGuideUi("other-quest")).leftRailPct).toBe(18);
  });

  it("puts every separator in the tab order", async () => {
    await renderGuide();
    const handle = separators()[0];
    if (!handle) throw new Error("no separator to reach");
    handle.focus();
    expect(document.activeElement).toBe(handle);
  });

  // Deliberately not tested here: what a resize resolves to. The group sizes
  // itself from a measured box and jsdom reports every box as zero, so driving
  // an arrow key makes the library throw "Previous layout not found" rather
  // than resize anything — an environment limit, not a defect.
  //
  // What survives in tests is the arithmetic on the record (useGuideUi clamps
  // each division to something usable) and the wiring above. The pixels
  // themselves are a checkpoint-G item, in a real browser.
});
