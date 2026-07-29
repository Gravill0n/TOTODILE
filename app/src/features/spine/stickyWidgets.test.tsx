// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WidgetsSheet } from "@/features/spine/WidgetsSheet";
import type { ProgressSlice } from "@/types/progressSlice";

afterEach(cleanup);

const emptyProgress: ProgressSlice = {
  doneIds: new Set(),
  counterValues: {},
};

const noopHandlers = {
  onToggle: () => {},
  onAdjustCounter: () => {},
  onResetCounter: () => {},
  resolveAsset: (p: string) => p,
};

function renderSheet() {
  render(
    <WidgetsSheet
      widgets={[]}
      progress={emptyProgress}
      wholeGame={false}
      onWholeGameChange={() => {}}
      onClose={() => {}}
      {...noopHandlers}
    />,
  );
}

// The desktop rails used to be sticky panels in a scrolling page; they are
// now columns in a shell that does not scroll at all, so that contract moved
// to postureLayout.test.tsx ("scrolls each column, never the window"). What
// stays here is the sheet, which is still a scroll container of its own.
describe("sticky widgets (Build 4)", () => {
  it("pins the sheet header — only the widget list scrolls under it", () => {
    renderSheet();
    const list = document.querySelector(".overflow-y-auto");
    expect(list).not.toBeNull();
    // In the sheet's flex column, the list needs flex-1 + min-h-0 to be the
    // scroll container; otherwise the whole sheet (header included) scrolls.
    expect(list?.className).toContain("flex-1");
    expect(list?.className).toContain("min-h-0");
    expect(screen.getByText("Widgets").closest(".overflow-y-auto")).toBeNull();
  });

  it("sheet content respects the bottom safe-area inset", () => {
    renderSheet();
    const content = document.querySelector('[data-slot="sheet-content"]');
    expect(content?.className).toContain("safe-area-inset-bottom");
  });
});
