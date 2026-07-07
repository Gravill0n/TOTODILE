// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StepRow } from "@/features/spine/StepRow";
import { step as stepSchema } from "@/schema";

const noop = () => {};

function renderStep(isCurrent: boolean) {
  const step = stepSchema.parse({
    id: "g:v1:s1",
    order: 0,
    keywords: ["First beat", "Second beat"],
    detail: "The full prose explanation of the step.",
    sourceRefs: ["src-x"],
    confidence: "normal",
  });
  return render(
    <StepRow
      step={step}
      slug="g"
      isCurrent={isCurrent}
      isDone={false}
      isSkipped={false}
      onToggleDone={noop}
      onToggleSkip={noop}
      onMarkThrough={noop}
      onMoveHere={noop}
    />,
  );
}

afterEach(cleanup);

describe("StepRow keyword/detail rendering (D3)", () => {
  it("shows the keyword beats by default and keeps detail collapsed", () => {
    renderStep(true);
    expect(screen.getByText("First beat · Second beat")).toBeDefined();
    expect(screen.queryByText(/full prose explanation/)).toBeNull();
  });

  it("toggles the detail open and closed (aria-expanded tracks state)", () => {
    renderStep(true);
    const toggle = screen.getByRole("button", { name: /^details/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(screen.getByText(/full prose explanation/)).toBeDefined();
    const open = screen.getByRole("button", { name: /hide details/i });
    expect(open.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(open);
    expect(screen.queryByText(/full prose explanation/)).toBeNull();
  });

  it("offers the detail toggle on a non-current row too", () => {
    renderStep(false);
    fireEvent.click(screen.getByRole("button", { name: /^details/i }));
    expect(screen.getByText(/full prose explanation/)).toBeDefined();
  });

  it("renders no toggle when a step has no detail", () => {
    const step = stepSchema.parse({
      id: "g:v1:s2",
      order: 1,
      keywords: ["Only a beat"],
      sourceRefs: ["src-x"],
      confidence: "normal",
    });
    render(
      <StepRow
        step={step}
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
    expect(screen.queryByRole("button", { name: /^details/i })).toBeNull();
  });
});
