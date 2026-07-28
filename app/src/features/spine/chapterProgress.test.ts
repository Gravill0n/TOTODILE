import { describe, expect, it } from "vitest";
import {
  chapterProgress,
  visitIndex,
  visitOfStep,
} from "@/features/spine/chapterProgress";
import { guideFile } from "@/schema";
import { validGuide } from "@/testing/helpers";

// Backtracking is the case that matters: the same location is reached more than
// once, so a "visit" is not interchangeable with its place (COMPILER_PASS
// CONTRACT / spine pass). Two visits to the cave, split across two chapters.
function backtrackingGuide() {
  return guideFile.parse({
    schemaVersion: 2,
    guideId: "g",
    locations: [
      { id: "g:cave", name: "Cave" },
      { id: "g:town", name: "Town" },
    ],
    chapters: [
      {
        id: "g:c1",
        title: "Chapter 1",
        order: 0,
        visits: [
          {
            id: "g:v-cave-1",
            locationId: "g:cave",
            order: 0,
            steps: [step("g:v-cave-1:s1", 0), step("g:v-cave-1:s2", 1)],
          },
          {
            id: "g:v-town-1",
            locationId: "g:town",
            order: 1,
            steps: [step("g:v-town-1:s1", 0)],
          },
        ],
      },
      {
        id: "g:c2",
        title: "Chapter 2",
        order: 1,
        visits: [
          {
            id: "g:v-cave-2",
            locationId: "g:cave",
            order: 0,
            steps: [step("g:v-cave-2:s1", 0)],
          },
        ],
      },
    ],
  });
}

function step(id: string, order: number) {
  return {
    id,
    order,
    keywords: ["Do the thing"],
    achievementRefs: [],
    images: [],
    sourceRefs: ["src-1"],
    confidence: "normal",
  };
}

describe("chapterProgress", () => {
  it("counts done steps per chapter over the whole chapter tree", () => {
    const guide = backtrackingGuide();
    const chapters = chapterProgress(
      guide,
      new Set(["g:v-cave-1:s1", "g:v-town-1:s1"]),
    );

    expect(chapters.map((c) => [c.chapterId, c.done, c.total])).toEqual([
      ["g:c1", 2, 3],
      ["g:c2", 0, 1],
    ]);
  });

  it("reports each visit separately when a location is revisited", () => {
    const chapters = chapterProgress(backtrackingGuide(), new Set());
    const caveVisits = chapters
      .flatMap((chapter) => chapter.visits)
      .filter((visit) => visit.locationId === "g:cave");

    expect(caveVisits.map((v) => v.visitId)).toEqual([
      "g:v-cave-1",
      "g:v-cave-2",
    ]);
    expect(caveVisits.map((v) => v.total)).toEqual([2, 1]);
  });

  it("carries the location name so the rail needs no second lookup", () => {
    const chapters = chapterProgress(backtrackingGuide(), new Set());
    expect(chapters[0]?.visits[0]?.locationName).toBe("Cave");
  });

  it("counts a done step that no longer exists in the guide as nothing", () => {
    const chapters = chapterProgress(
      backtrackingGuide(),
      new Set(["g:v-gone:s9"]),
    );
    expect(chapters.map((c) => c.done)).toEqual([0, 0]);
  });
});

describe("visitIndex", () => {
  it("walks visits in spine order across chapter boundaries", () => {
    const visits = visitIndex(backtrackingGuide());
    expect(visits.map((v) => v.visitId)).toEqual([
      "g:v-cave-1",
      "g:v-town-1",
      "g:v-cave-2",
    ]);
    expect(visits.map((v) => v.chapterId)).toEqual(["g:c1", "g:c1", "g:c2"]);
  });

  it("links each visit to its neighbours and ends open", () => {
    const visits = visitIndex(backtrackingGuide());
    expect(visits[0]?.previousVisitId).toBeNull();
    expect(visits[0]?.nextVisitId).toBe("g:v-town-1");
    expect(visits[2]?.previousVisitId).toBe("g:v-town-1");
    expect(visits[2]?.nextVisitId).toBeNull();
  });

  // "Visit 1 of 2" in the breadcrumb counts visits to THIS place, not the
  // visit's position in the route.
  it("numbers a visit among the visits to its own location", () => {
    const visits = visitIndex(backtrackingGuide());
    const [cave1, town1, cave2] = visits;

    expect([cave1?.ordinalAtLocation, cave1?.visitsAtLocation]).toEqual([1, 2]);
    expect([cave2?.ordinalAtLocation, cave2?.visitsAtLocation]).toEqual([2, 2]);
    expect([town1?.ordinalAtLocation, town1?.visitsAtLocation]).toEqual([1, 1]);
  });

  it("carries the chapter title and the visit's step ids", () => {
    const visits = visitIndex(backtrackingGuide());
    expect(visits[0]?.chapterTitle).toBe("Chapter 1");
    expect(visits[0]?.stepIds).toEqual(["g:v-cave-1:s1", "g:v-cave-1:s2"]);
  });
});

describe("visitOfStep", () => {
  it("finds the visit holding a step", () => {
    const guide = backtrackingGuide();
    expect(visitOfStep(guide, "g:v-cave-2:s1")?.visitId).toBe("g:v-cave-2");
  });

  it("returns undefined for a null or unknown step", () => {
    const guide = backtrackingGuide();
    expect(visitOfStep(guide, null)).toBeUndefined();
    expect(visitOfStep(guide, "g:v-nope:s1")).toBeUndefined();
  });

  it("works on the shared fixture guide too", () => {
    const guide = guideFile.parse(validGuide());
    const first = visitIndex(guide)[0];
    expect(visitOfStep(guide, first?.stepIds[0] ?? "")?.visitId).toBe(
      first?.visitId,
    );
  });
});
