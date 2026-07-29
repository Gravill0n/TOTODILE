import { describe, expect, it } from "vitest";
import {
  arrangeWidgets,
  canMove,
  moveWidget,
} from "@/features/spine/widgetOrder";
import type { Widget } from "@/schema";

// The arrangement is data, not a rendered column — these are the rules the
// stack obeys, independent of dnd-kit or any button.

const widget = (id: string, deckPosition: number) =>
  ({ id, deckPosition }) as Widget;

const deck = [widget("g:alpha", 0), widget("g:beta", 1), widget("g:gamma", 2)];

const ids = (widgets: Widget[]) => widgets.map((w) => w.id);

describe("arrangeWidgets", () => {
  it("falls back to deck order for a guide never arranged", () => {
    expect(ids(arrangeWidgets(deck, [], []))).toEqual([
      "g:alpha",
      "g:beta",
      "g:gamma",
    ]);
  });

  it("follows the stored order", () => {
    const order = ["g:gamma", "g:alpha", "g:beta"];
    expect(ids(arrangeWidgets(deck, order, []))).toEqual(order);
  });

  it("appends a widget the stored order has never seen", () => {
    // A recompile added gamma after the player arranged the other two — the
    // arrangement survives and the newcomer lands at the end.
    const order = ["g:beta", "g:alpha"];
    expect(ids(arrangeWidgets(deck, order, []))).toEqual([
      "g:beta",
      "g:alpha",
      "g:gamma",
    ]);
  });

  it("lifts pinned widgets to the top, keeping their relative order", () => {
    const order = ["g:gamma", "g:alpha", "g:beta"];
    expect(ids(arrangeWidgets(deck, order, ["g:beta", "g:alpha"]))).toEqual([
      "g:alpha",
      "g:beta",
      "g:gamma",
    ]);
  });

  it("ignores stored ids for widgets this guide no longer has", () => {
    const order = ["g:deleted", "g:beta"];
    expect(ids(arrangeWidgets(deck, order, []))).toEqual([
      "g:beta",
      "g:alpha",
      "g:gamma",
    ]);
  });
});

describe("moveWidget", () => {
  const arranged = arrangeWidgets(deck, [], []);

  it("swaps with the neighbour above and below", () => {
    expect(moveWidget(arranged, "g:beta", -1, [])).toEqual([
      "g:beta",
      "g:alpha",
      "g:gamma",
    ]);
    expect(moveWidget(arranged, "g:beta", 1, [])).toEqual([
      "g:alpha",
      "g:gamma",
      "g:beta",
    ]);
  });

  it("stays put at the ends", () => {
    expect(moveWidget(arranged, "g:alpha", -1, [])).toEqual(ids(arranged));
    expect(moveWidget(arranged, "g:gamma", 1, [])).toEqual(ids(arranged));
    expect(canMove(arranged, "g:alpha", -1, [])).toBe(false);
    expect(canMove(arranged, "g:alpha", 1, [])).toBe(true);
  });

  it("will not cross the pinned boundary — unpinning is an explicit act", () => {
    const pinned = ["g:alpha"];
    const withPin = arrangeWidgets(deck, [], pinned);
    expect(moveWidget(withPin, "g:alpha", 1, pinned)).toEqual(ids(withPin));
    expect(moveWidget(withPin, "g:beta", -1, pinned)).toEqual(ids(withPin));
    expect(canMove(withPin, "g:beta", 1, pinned)).toBe(true);
  });
});
