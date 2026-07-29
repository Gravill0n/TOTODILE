// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChapterRail } from "@/features/spine/ChapterRail";
import { chapterProgress } from "@/features/spine/chapterProgress";
import { guideFile } from "@/schema";

// The rail is the answer to "where am I in this game" that the whole-spine
// scroll used to give by sheer length. It reads off chapterProgress, so the
// numbers here and the ones in the header can never drift.

afterEach(cleanup);

// The cave is visited twice — once per chapter — which is the case a
// location-keyed rail would get wrong (CLAUDE.md compiler note).
function guide() {
  const step = (id: string, order = 0) => ({
    id,
    order,
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
        title: "One — The Harbor",
        order: 0,
        visits: [
          {
            id: "g:v-harbor-1",
            locationId: "g:harbor",
            order: 0,
            steps: [step("g:v-harbor-1:s1"), step("g:v-harbor-1:s2", 1)],
          },
          {
            id: "g:v-cave-1",
            locationId: "g:cave",
            order: 1,
            steps: [step("g:v-cave-1:s1")],
          },
        ],
      },
      {
        id: "g:c2",
        title: "Two — Back to the Cave",
        order: 1,
        visits: [
          {
            id: "g:v-cave-2",
            locationId: "g:cave",
            order: 0,
            steps: [step("g:v-cave-2:s1"), step("g:v-cave-2:s2", 1)],
          },
        ],
      },
    ],
    widgets: [],
  });
}

function renderRail(
  visitId = "g:v-harbor-1",
  doneIds = new Set(["g:v-harbor-1:s1"]),
  onOpenVisit = vi.fn(),
) {
  render(
    <ChapterRail
      chapters={chapterProgress(guide(), doneIds)}
      slug="g"
      visitId={visitId}
      onOpenVisit={onOpenVisit}
    />,
  );
  return onOpenVisit;
}

describe("ChapterRail", () => {
  it("shows each chapter's completion from the selector", () => {
    renderRail();
    // Chapter one: one of three steps done.
    expect(screen.getByText("33%")).toBeDefined();
    expect(screen.getByText("1 / 3")).toBeDefined();
    // Chapter two: untouched.
    expect(screen.getByText("0%")).toBeDefined();
    expect(screen.getByText("0 / 2")).toBeDefined();
  });

  it("opens the displayed visit's chapter and marks it", () => {
    renderRail("g:v-cave-2");
    // Chapter two is where the URL points, so its visits are already showing.
    expect(screen.getByRole("link", { name: /Cave/ })).toBeDefined();
    expect(screen.queryByRole("link", { name: /Harbor/ })).toBeNull();
  });

  it("gives a twice-visited location one entry per visit", () => {
    renderRail();
    // The cave in chapter one and the cave in chapter two are two rows with
    // two different addresses — a location-keyed rail would collapse them.
    expect(
      screen.getByRole("link", { name: /Cave/ }).getAttribute("href"),
    ).toBe("#/guide/g/chapter/c1/visit/v-cave-1");

    fireEvent.click(
      screen.getByRole("button", { name: /Two — Back to the Cave/ }),
    );
    const caves = screen
      .getAllByRole("link", { name: /Cave/ })
      .map((link) => link.getAttribute("href"));
    expect(caves).toContain("#/guide/g/chapter/c2/visit/v-cave-2");
  });

  it("follows a visit without leaving the page to the browser", () => {
    const onOpenVisit = renderRail();
    fireEvent.click(screen.getByRole("link", { name: /Cave/ }));
    expect(onOpenVisit).toHaveBeenCalledWith("g:v-cave-1");
  });

  it("leaves modified clicks to the browser, so a visit opens in a new tab", () => {
    const onOpenVisit = renderRail();
    fireEvent.click(screen.getByRole("link", { name: /Cave/ }), {
      metaKey: true,
    });
    expect(onOpenVisit).not.toHaveBeenCalled();
  });
});
