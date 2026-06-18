// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Checklist } from "../../src/primitives/checklist/Checklist";
import { Counter } from "../../src/primitives/counter/Counter";
import { PrepCard } from "../../src/primitives/prepCard/PrepCard";
import type { ProgressSlice } from "../../src/progress/progressSlice";
import {
  checklistWidget,
  counterWidget,
  prepCardWidget,
} from "../../src/schema";

// A feature component must no longer style with the legacy achievement-accent
// utilities (text/border/bg-accent or the accent-accent checkbox colour) — that
// token is being reclaimed for shadcn's hover surface in the F3 flip. Checked
// against source, not rendered HTML, since the nested shadcn primitives use
// `accent` for their own hover surface legitimately.
const LEGACY_ACCENT =
  /\b(?:text|border|bg)-accent(?!-foreground)\b|\baccent-accent\b/;
function source(relPath: string): string {
  // Vitest runs with cwd = app/.
  return readFileSync(`src/${relPath}`, "utf8");
}

const noProgress: ProgressSlice = { doneIds: new Set(), counterValues: {} };

const checklist = checklistWidget.parse({
  id: "g:cl",
  type: "checklist",
  title: "List",
  scope: { kind: "global" },
  deckPosition: 1,
  rows: [
    {
      itemId: "g:cl:a",
      label: "Gate key",
      sourceRefs: ["src-x"],
      confidence: "normal",
    },
  ],
});

const counter = counterWidget.parse({
  id: "g:co",
  type: "counter",
  title: "Counter",
  scope: { kind: "global" },
  deckPosition: 2,
  counters: [
    {
      itemId: "g:co:a",
      label: "Coins",
      target: 5,
      sourceRefs: ["src-x"],
      confidence: "normal",
    },
  ],
});

const prep = prepCardWidget.parse({
  id: "g:pc",
  type: "prepCard",
  title: "Prep",
  scope: { kind: "global" },
  deckPosition: 3,
  items: [
    {
      itemId: "g:pc:a",
      label: "Potion",
      quantity: 5,
      sourceRefs: ["src-x"],
      confidence: "normal",
    },
  ],
});

afterEach(cleanup);

describe("Checklist reskin (R4a)", () => {
  it("uses a shadcn Checkbox and toggles by item id", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <Checklist
        widget={checklist}
        progress={noProgress}
        onToggle={onToggle}
      />,
    );
    expect(container.querySelector('[data-slot="checkbox"]')).not.toBeNull();
    fireEvent.click(screen.getByLabelText("Gate key"));
    expect(onToggle).toHaveBeenCalledWith("g:cl:a");
  });
});

describe("Counter reskin (R4a)", () => {
  it("uses the primary token for the complete treatment, not legacy accent", () => {
    const { container } = render(
      <Counter
        widget={counter}
        progress={{ doneIds: new Set(), counterValues: { "g:co:a": 5 } }}
        onAdjust={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(container.innerHTML).toContain("primary");
    expect(source("primitives/counter/Counter.tsx")).not.toMatch(LEGACY_ACCENT);
  });
});

describe("PrepCard reskin (R4a)", () => {
  it("uses a shadcn Checkbox, a Badge for quantity, and primary for ready", () => {
    const { container } = render(
      <PrepCard
        widget={prep}
        progress={{ doneIds: new Set(["g:pc:a"]), counterValues: {} }}
        onToggle={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-slot="checkbox"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="badge"]')).not.toBeNull();
    expect(container.innerHTML).toContain("primary");
    expect(source("primitives/prepCard/PrepCard.tsx")).not.toMatch(
      LEGACY_ACCENT,
    );
  });
});
