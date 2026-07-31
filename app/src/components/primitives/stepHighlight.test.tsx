// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetRenderer } from "@/components/primitives/WidgetRenderer";
import { widget as widgetSchema } from "@/schema";
import {
  validChecklist,
  validDataTable,
  validMapPins,
  validPrepCard,
} from "@/testing/helpers";
import type { ProgressSlice } from "@/types/progressSlice";

afterEach(cleanup);

// The visible half of the step↔row link: the items the step under the pointer
// hands over point at themselves. It changes nothing — a highlighted row is
// not a done row — so what is worth pinning is that the ring appears, that it
// is the same ring everywhere, and that done state is untouched.

function renderWidget(raw: unknown, highlightIds: string[]) {
  const slice: ProgressSlice = {
    doneIds: new Set(),
    counterValues: {},
    highlightIds: new Set(highlightIds),
  };
  const onToggle = vi.fn();
  render(
    <WidgetRenderer
      widget={widgetSchema.parse(raw)}
      progress={slice}
      onToggle={onToggle}
      onAdjustCounter={vi.fn()}
      onResetCounter={vi.fn()}
      resolveAsset={(path) => path}
    />,
  );
  return onToggle;
}

const ringed = () =>
  [...document.querySelectorAll("[class*='ring-2']")].filter((el) =>
    el.className.includes("ring-primary"),
  );

describe("the current step's rows point at themselves", () => {
  it("rings the linked checklist row and nothing else", () => {
    renderWidget(validChecklist(1), ["fictional-quest:w1:r1"]);
    expect(ringed()).toHaveLength(1);
  });

  it("rings a linked table row", () => {
    renderWidget(validDataTable(3), ["fictional-quest:w3:sentry"]);
    expect(ringed().length).toBeGreaterThan(0);
  });

  it("rings a linked prep-card item", () => {
    renderWidget(validPrepCard(7), ["fictional-quest:w7:p1"]);
    expect(ringed().length).toBeGreaterThan(0);
  });

  it("rings a linked map pin", () => {
    renderWidget(validMapPins(6), ["fictional-quest:w6:shard1"]);
    expect(ringed().length).toBeGreaterThan(0);
  });

  it("rings nothing when the step hands over nothing", () => {
    renderWidget(validChecklist(1), []);
    expect(ringed()).toHaveLength(0);
  });

  // The failure mode worth guarding: a highlight that quietly ticks things.
  it("never changes done state — no toggle fires, nothing reads as checked", () => {
    const onToggle = renderWidget(validChecklist(1), ["fictional-quest:w1:r1"]);
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Gate key").getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("is absent entirely when the slice carries no highlight set", () => {
    render(
      <WidgetRenderer
        widget={widgetSchema.parse(validChecklist(1))}
        progress={{ doneIds: new Set(), counterValues: {} }}
        onToggle={vi.fn()}
        onAdjustCounter={vi.fn()}
        onResetCounter={vi.fn()}
        resolveAsset={(path) => path}
      />,
    );
    expect(ringed()).toHaveLength(0);
  });
});
