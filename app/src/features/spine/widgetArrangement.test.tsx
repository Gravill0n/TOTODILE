// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readGuideUi } from "@/features/progress/guideUiStore";
import { closeProgressDb } from "@/features/progress/progressStore";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";

// Reordering is driven here through the buttons, not the drag: the buttons are
// the accessible path (and the only sane one on a phone), so they are what has
// to work. dnd-kit's pointer/keyboard sensors ride on the same arrangement.

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

// The widget cards in the desktop column, top to bottom.
const stackTitles = () =>
  screen
    .getAllByLabelText(/^Move up: /)
    .map((button) =>
      button.getAttribute("aria-label")?.slice("Move up: ".length),
    );

describe("arranging the widget stack", () => {
  it("moves a widget down and remembers it", async () => {
    await renderGuide();
    const before = stackTitles();
    const first = before[0] ?? "";

    fireEvent.click(screen.getByLabelText(`Move down: ${first}`));

    await waitFor(() => expect(stackTitles()[1]).toBe(first));
    // The whole arrangement is written, not just the pair that swapped, so a
    // later recompile has a complete list to append to.
    await waitFor(async () => {
      const stored = await readGuideUi("fictional-quest");
      expect(stored.widgetOrder).toHaveLength(before.length);
    });
  });

  it("keeps the arrangement across a remount", async () => {
    await renderGuide();
    const first = stackTitles()[0] ?? "";
    fireEvent.click(screen.getByLabelText(`Move down: ${first}`));
    await waitFor(() => expect(stackTitles()[1]).toBe(first));
    cleanup();

    await renderGuide();
    await waitFor(() => expect(stackTitles()[1]).toBe(first));
  });

  it("pins a widget to the top and marks it", async () => {
    await renderGuide();
    const titles = stackTitles();
    const last = titles[titles.length - 1] ?? "";

    fireEvent.click(screen.getByLabelText(`Pin: ${last}`));

    await waitFor(() => expect(stackTitles()[0]).toBe(last));
    const pin = screen.getByLabelText(`Unpin: ${last}`);
    expect(pin.getAttribute("aria-pressed")).toBe("true");
    await waitFor(async () => {
      const stored = await readGuideUi("fictional-quest");
      expect(stored.pinnedWidgetIds).toHaveLength(1);
    });
  });

  it("refuses to move a widget off the ends", async () => {
    await renderGuide();
    const titles = stackTitles();
    expect(screen.getByLabelText(`Move up: ${titles[0]}`)).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByLabelText(`Move down: ${titles[titles.length - 1]}`),
    ).toHaveProperty("disabled", true);
  });
});
