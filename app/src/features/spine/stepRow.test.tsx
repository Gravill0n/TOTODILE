// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StepRow } from "@/features/spine/StepRow";
import { step as stepSchema } from "@/schema";

const noop = () => {};

function renderStep(isCurrent: boolean, overrides: object = {}) {
  const step = stepSchema.parse({
    id: "g:v1:s1",
    order: 0,
    keywords: ["First beat", "Second beat"],
    detail: "The full prose explanation of the step.",
    sourceRefs: ["src-x"],
    confidence: "normal",
    ...overrides,
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
    // Beats are actions, one per line — not one sentence joined by separators.
    expect(screen.getByText("First beat")).toBeDefined();
    expect(screen.getByText("Second beat")).toBeDefined();
    expect(screen.queryByText("First beat · Second beat")).toBeNull();
    expect(screen.queryByText(/full prose explanation/)).toBeNull();
  });

  it("keeps every beat inside the one move-pointer target", () => {
    renderStep(false);
    const move = screen.getByRole("button", { name: /^First beat/ });
    // Tapping any line moves the pointer: the lines are inside one button.
    expect(move.textContent).toContain("First beat");
    expect(move.textContent).toContain("Second beat");
    // …and the accessible names stay the joined form — a label is a name,
    // not a layout, and the rest of the suite pins these strings.
    expect(
      screen.getByLabelText("Done: First beat · Second beat"),
    ).toBeDefined();
    expect(
      screen.getByLabelText("Skip for later: First beat · Second beat"),
    ).toBeDefined();
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

// Design v2 gives every row the same anatomy — icon, beats, badge row, the two
// icon actions — and marks the current one rather than building it differently.
describe("StepRow anatomy (design v2)", () => {
  it("shows the item icon on an ordinary row, not only on the current one", () => {
    renderStep(false, {
      images: [{ src: "images/icon-bomb.png", alt: "Bomb bag" }],
    });
    const icon = screen.getByRole("img", { name: "Bomb bag" });
    expect(icon.getAttribute("src")).toBe("guides/g/images/icon-bomb.png");
    // Sprite art, scaled up: never smoothed.
    expect(icon.className).toContain("pixelated");
    // Still the lightbox, just smaller.
    expect(
      screen.getByRole("button", { name: "Zoom: Bomb bag" }),
    ).toBeDefined();
  });

  it("leaves no icon gap on a step that has no image", () => {
    renderStep(false);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("gives every row the same two icon actions", () => {
    for (const current of [true, false]) {
      renderStep(current);
      expect(
        screen.getByLabelText(/^Skip for later: First beat/),
      ).toBeDefined();
      expect(
        screen.getByLabelText(/^Mark all through here: First beat/),
      ).toBeDefined();
      cleanup();
    }
  });

  it("marks the current row rather than rebuilding it", () => {
    renderStep(true);
    const row = document.querySelector("[data-current]");
    expect(row?.className).toContain("border-primary");
    expect(row?.className).toContain("bg-card");
    expect(screen.getByText("Now")).toBeDefined();
  });

  it("carries the achievement count as a badge", () => {
    renderStep(false, { achievementRefs: [1, 2, 3] });
    expect(
      screen.getByLabelText("3 achievement(s) here").textContent,
    ).toContain("×3");
  });
});
