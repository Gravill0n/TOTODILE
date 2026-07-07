// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { guideFile } from "@/schema";
import { NowScreen } from "@/spine/NowScreen";

const noop = () => {};

function guide() {
  const step = (id: string) => ({
    id,
    order: 0,
    keywords: [id.split(":").pop() ?? "beat"],
    sourceRefs: ["s"],
    confidence: "normal" as const,
  });
  return guideFile.parse({
    schemaVersion: 1,
    guideId: "g",
    locations: [
      { id: "g:harbor", name: "Harbor" },
      { id: "g:cave", name: "Cave" },
    ],
    chapters: [
      {
        id: "g:c1",
        title: "One",
        order: 0,
        visits: [
          {
            id: "g:v-harbor-1",
            locationId: "g:harbor",
            order: 0,
            steps: [step("g:v-harbor-1:s1")],
          },
          {
            id: "g:v-cave-1",
            locationId: "g:cave",
            order: 1,
            steps: [step("g:v-cave-1:s1")],
          },
        ],
      },
    ],
    widgets: [],
  });
}

function renderNow(currentStepId: string | null) {
  return render(
    <NowScreen
      guide={guide()}
      slug="g"
      currentStepId={currentStepId}
      doneIds={new Set()}
      skippedIds={new Set()}
      onToggleDone={noop}
      onToggleSkip={noop}
      onMarkThrough={noop}
      onMovePointer={noop}
    />,
  );
}

afterEach(cleanup);

describe("NowScreen preferred-next affordance (D6)", () => {
  it("surfaces the next visit's location, linking to its place screen", () => {
    // pointer on the last (only) step of the harbor visit → next is the Cave
    renderNow("g:v-harbor-1:s1");
    const next = screen.getByText("Next up — Cave");
    expect(next.getAttribute("href")).toBe("#/guide/g/place/cave");
  });

  it("shows nothing once the route's final visit is reached", () => {
    renderNow("g:v-cave-1:s1");
    expect(screen.queryByText(/Next up/)).toBeNull();
  });
});
