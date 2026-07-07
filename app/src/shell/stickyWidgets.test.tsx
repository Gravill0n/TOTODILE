// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ProgressSlice } from "@/progress/progressSlice";
import { PostureLayout } from "@/shell/PostureLayout";
import { WidgetsSheet } from "@/shell/WidgetsSheet";

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

describe("sticky widgets (Build 4)", () => {
  it("desktop side panels stick within the viewport and scroll internally", () => {
    render(
      <PostureLayout leftPanel={<div>left</div>} rightPanel={<div>right</div>}>
        main
      </PostureLayout>,
    );
    const asides = [
      screen.getByLabelText("Global widgets"),
      screen.getByLabelText("Widgets in scope"),
    ];
    for (const aside of asides) {
      expect(aside.className).toContain("sticky");
      // Required for sticky to bite inside a stretch-aligned flex row.
      expect(aside.className).toContain("self-start");
      // Long panels scroll internally instead of growing past the viewport.
      expect(aside.className).toContain("overflow-y-auto");
    }
  });

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
