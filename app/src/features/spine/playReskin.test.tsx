// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { step as stepSchema } from "@/schema";
import { MissableBanner } from "@/spine/MissableBanner";
import { StepRow } from "@/spine/StepRow";

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

describe("MissableBanner reskin (R3)", () => {
  const items = [
    {
      stepId: "g:v1:s2",
      deadline: "Before opening the gate",
      location: "Gate",
    },
  ];

  it("is an alert and tags the missable with a Badge in the missable colour", () => {
    const { container } = render(
      <MissableBanner items={items} onAcknowledge={noop} onJump={noop} />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge).not.toBeNull();
  });
});
