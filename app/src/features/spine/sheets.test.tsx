// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterSheet } from "@/features/spine/ChapterSheet";
import { WidgetsSheet } from "@/features/spine/WidgetsSheet";
import type { ProgressSlice } from "@/types/progressSlice";

afterEach(cleanup);

// The sheet shows the same rail the desktop column does, so it takes the
// same chapterProgress rows.
const chapters = [
  {
    chapterId: "g:c1",
    title: "Chapter 1 — The Gate",
    done: 1,
    total: 2,
    visits: [
      {
        visitId: "g:v-gate-1",
        locationId: "g:gate",
        locationName: "The Gate",
        done: 1,
        total: 2,
      },
    ],
  },
  {
    chapterId: "g:c2",
    title: "Chapter 2 — The Vault",
    done: 0,
    total: 1,
    visits: [
      {
        visitId: "g:v-vault-1",
        locationId: "g:vault",
        locationName: "The Vault",
        done: 0,
        total: 1,
      },
    ],
  },
];

function renderChapterSheet(
  props: { onOpenVisit?: () => void; onClose?: () => void } = {},
) {
  render(
    <ChapterSheet
      chapters={chapters}
      slug="g"
      visitId="g:v-gate-1"
      onOpenVisit={props.onOpenVisit ?? (() => {})}
      onClose={props.onClose ?? (() => {})}
    />,
  );
}

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

describe("ChapterSheet (R2 — Radix Sheet)", () => {
  it("renders as a dialog with the labelled close affordance", () => {
    renderChapterSheet();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Close chapter list")).toBeTruthy();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderChapterSheet({ onClose });
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("opens a visit from the chapter it is in", () => {
    const onOpenVisit = vi.fn();
    renderChapterSheet({ onOpenVisit });
    // Chapter 2 is not where the URL points, so it takes a tap to reveal.
    fireEvent.click(
      screen.getByRole("button", { name: "Chapter 2 — The Vault" }),
    );
    fireEvent.click(screen.getByRole("link", { name: /The Vault/ }));
    expect(onOpenVisit).toHaveBeenCalledWith("g:v-vault-1");
  });
});

describe("WidgetsSheet (R2 — Radix Sheet)", () => {
  it("uses a Switch for the whole-game toggle", () => {
    const onWholeGameChange = vi.fn();
    render(
      <WidgetsSheet
        widgets={[]}
        progress={emptyProgress}
        wholeGame={false}
        onWholeGameChange={onWholeGameChange}
        onClose={() => {}}
        {...noopHandlers}
      />,
    );
    const toggle = screen.getByRole("switch", { name: "Whole game" });
    fireEvent.click(toggle);
    expect(onWholeGameChange).toHaveBeenCalledWith(true);
  });

  it("renders inside a dialog with the labelled close affordance", () => {
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
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Close widgets")).toBeTruthy();
    expect(screen.getByText("Widgets")).toBeTruthy();
  });
});
