// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MissableCard } from "@/features/spine/MissableCard";
import { StepRow } from "@/features/spine/StepRow";
import { step as stepSchema } from "@/schema";

const noop = () => {};

function currentStep() {
  return stepSchema.parse({
    id: "g:v1:s1",
    order: 0,
    keywords: ["First beat"],
    detail: "The full prose explanation of the step.",
    achievementRefs: [1],
    sourceRefs: ["src-x"],
    confidence: "normal",
  });
}

afterEach(cleanup);

describe("StepRow reskin (R3)", () => {
  it("expands detail through a Radix Collapsible", () => {
    const { container } = render(
      <StepRow
        step={currentStep()}
        slug="g"
        isCurrent
        isDone={false}
        isSkipped={false}
        onToggleDone={noop}
        onToggleSkip={noop}
        onMarkThrough={noop}
        onMoveHere={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^details/i }));
    expect(
      container.querySelector('[data-slot="collapsible-content"]'),
    ).not.toBeNull();
  });

  it("styles the current-step treatment with the primary token, not the legacy accent utility", () => {
    const { container } = render(
      <StepRow
        step={currentStep()}
        slug="g"
        isCurrent
        isDone={false}
        isSkipped={false}
        onToggleDone={noop}
        onToggleSkip={noop}
        onMarkThrough={noop}
        onMoveHere={noop}
      />,
    );
    const html = container.innerHTML;
    expect(html).toContain("primary");
    // Achievement/now treatment must no longer ride the `accent` utility — it
    // is being reclaimed for shadcn's hover surface (F3 deferral).
    expect(html).not.toMatch(/\b(border|text|accent)-accent\b/);
  });
});

describe("MissableCard reskin (R3)", () => {
  it("wears the missable signal tint, not a generic warning", () => {
    const { container } = render(
      <MissableCard deadline="Before opening the gate" onAcknowledge={noop} />,
    );
    const html = container.innerHTML;
    expect(html).toContain("border-missable");
    expect(html).toContain("bg-missable-bg");
    expect(html).toContain("text-missable-ink");
    expect(screen.getByText("Missable ahead")).toBeTruthy();
  });
});
