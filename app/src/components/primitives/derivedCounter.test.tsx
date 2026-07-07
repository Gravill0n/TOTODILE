// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Counter } from "@/components/primitives/counter/Counter";
import type { CounterWidget } from "@/schema";

afterEach(cleanup);

// A derived entry (#5): value counts checked derivedFrom ids, read-only.
const derivedWidget: CounterWidget = {
  id: "fictional-quest:w4",
  title: "Badges",
  scope: { kind: "global" },
  deckPosition: 3,
  type: "counter",
  counters: [
    {
      itemId: "fictional-quest:w4:badges",
      label: "Gym badges",
      derivedFrom: [
        "fictional-quest:c1:s1",
        "fictional-quest:c1:s2",
        "fictional-quest:c1:s3",
      ],
      sourceRefs: ["src-wiki"],
      confidence: "normal",
    },
  ],
};

function renderDerived(doneIds: string[]) {
  render(
    <Counter
      widget={derivedWidget}
      progress={{ doneIds: new Set(doneIds), counterValues: {} }}
      onAdjust={vi.fn()}
      onReset={vi.fn()}
    />,
  );
}

describe("derived counter (Build 2)", () => {
  it("derives its value from checked derivedFrom ids, ignoring counterValues", () => {
    renderDerived([
      "fictional-quest:c1:s1",
      "fictional-quest:c1:s3",
      "fictional-quest:w9:unrelated",
    ]);
    // 2 of the 3 derivedFrom ids are done; target defaults to their count.
    expect(screen.getByText("2 / 3")).toBeDefined();
  });

  it("shows the complete treatment when every derivedFrom id is done", () => {
    renderDerived([
      "fictional-quest:c1:s1",
      "fictional-quest:c1:s2",
      "fictional-quest:c1:s3",
    ]);
    expect(screen.getByText("3 / 3")).toBeDefined();
  });

  it("renders no adjust or reset controls for a derived entry", () => {
    renderDerived([]);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
