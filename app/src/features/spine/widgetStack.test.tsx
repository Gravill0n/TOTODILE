// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "@/features/progress/progressStore";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";

// Widgets used to be launcher buttons that opened a modal over the guide: to
// tick a checklist you left the page you were reading. They are cards in a
// column now, opening where they sit, so the spine stays on screen beside them.

const S1_TEXT = /Talk to gatekeeper ×2/;

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeProgressDb();
  await deleteDB("totodile");
});

const renderGuide = async () => {
  stubGuideContent();
  renderGuideAt("fictional-quest");
  await screen.findByText(S1_TEXT);
};

describe("widget stack (S3)", () => {
  it("opens a widget in place, with no dialog over the guide", async () => {
    await renderGuide();
    fireEvent.click(screen.getByRole("button", { name: /^Bestiary/ }));

    // The body renders where the card is; the spine is still on screen.
    expect(await screen.findByText("HP")).toBeDefined();
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
    expect(screen.getByText(S1_TEXT)).toBeDefined();
  });

  it("says what each widget is scoped to", async () => {
    await renderGuide();
    // The pointer is in chapter 1, so its checklist is in scope and says so.
    expect(screen.getAllByText("Global").length).toBeGreaterThan(0);
    expect(screen.getByText(/^Chapter · /)).toBeDefined();
  });

  it("closes again, leaving the card in the column", async () => {
    await renderGuide();
    const trigger = screen.getByRole("button", { name: /^Bestiary/ });
    fireEvent.click(trigger);
    await screen.findByText("HP");
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.queryByText("HP")).toBeNull());
    expect(screen.getByRole("button", { name: /^Bestiary/ })).toBeDefined();
  });

  it("carries one whole-game control per posture, not one per stack", async () => {
    await renderGuide();
    // Desktop column and phone sheet each own one; the sheet is closed here.
    expect(screen.getAllByLabelText("Whole game")).toHaveLength(1);
  });
});
