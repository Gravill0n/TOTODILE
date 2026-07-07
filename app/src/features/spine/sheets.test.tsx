// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterSheet } from "@/features/spine/ChapterSheet";
import { WidgetsSheet } from "@/features/spine/WidgetsSheet";
import type { ProgressSlice } from "@/types/progressSlice";

afterEach(cleanup);

const chapters = [
  { id: "c1", title: "Chapter 1 — The Gate" },
  { id: "c2", title: "Chapter 2 — The Vault" },
  // biome-ignore lint/suspicious/noExplicitAny: minimal chapter stubs for the sheet
] as any[];

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
    render(
      <ChapterSheet chapters={chapters} onJump={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Close chapter list")).toBeTruthy();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <ChapterSheet chapters={chapters} onJump={() => {}} onClose={onClose} />,
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("jumps to a chapter", () => {
    const onJump = vi.fn();
    render(
      <ChapterSheet chapters={chapters} onJump={onJump} onClose={() => {}} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Chapter 2 — The Vault" }),
    );
    expect(onJump).toHaveBeenCalledWith("c2");
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
