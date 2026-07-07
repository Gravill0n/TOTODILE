import { describe, expect, it } from "vitest";
import { chapterOf, guideStepIds, visitOf } from "@/lib/guide";
import { advancePointer } from "@/progress/pointer";
import { guideFile } from "@/schema";
import { validGuide, validLocation } from "@/testing/helpers";

// A two-chapter, three-visit guide so ordering and advance can cross both a
// visit boundary (within a chapter) and a chapter boundary. Two visits share a
// location to exercise revisits.
function multiVisitGuide() {
  const base = validGuide();
  const step = (id: string, order: number) => ({
    id,
    order,
    keywords: ["beat"],
    sourceRefs: ["src-wiki"],
    confidence: "normal" as const,
  });
  const value = {
    ...base,
    locations: [
      validLocation(),
      { id: "fictional-quest:throne-room", name: "Throne Room" },
    ],
    chapters: [
      {
        id: "fictional-quest:c1",
        title: "Chapter 1",
        order: 0,
        visits: [
          {
            id: "fictional-quest:v1",
            locationId: "fictional-quest:castle-gate",
            order: 0,
            steps: [
              step("fictional-quest:v1:s1", 0),
              step("fictional-quest:v1:s2", 1),
            ],
          },
          {
            id: "fictional-quest:v2",
            locationId: "fictional-quest:throne-room",
            order: 1,
            steps: [step("fictional-quest:v2:s1", 0)],
          },
        ],
      },
      {
        id: "fictional-quest:c2",
        title: "Chapter 2",
        order: 1,
        visits: [
          {
            // revisit of castle-gate
            id: "fictional-quest:v3",
            locationId: "fictional-quest:castle-gate",
            order: 0,
            steps: [step("fictional-quest:v3:s1", 0)],
          },
        ],
      },
    ],
    widgets: [],
  };
  return guideFile.parse(value);
}

describe("guideStepIds", () => {
  it("yields steps in spine order across visits and chapters", () => {
    expect(guideStepIds(multiVisitGuide())).toEqual([
      "fictional-quest:v1:s1",
      "fictional-quest:v1:s2",
      "fictional-quest:v2:s1",
      "fictional-quest:v3:s1",
    ]);
  });
});

describe("advancePointer across visit boundaries", () => {
  it("steps from the last step of one visit into the first of the next", () => {
    const ids = guideStepIds(multiVisitGuide());
    expect(advancePointer(ids, new Set(), "fictional-quest:v1:s2")).toBe(
      "fictional-quest:v2:s1",
    );
  });

  it("crosses a chapter boundary too", () => {
    const ids = guideStepIds(multiVisitGuide());
    expect(advancePointer(ids, new Set(), "fictional-quest:v2:s1")).toBe(
      "fictional-quest:v3:s1",
    );
  });

  it("skips blocked steps across a visit boundary", () => {
    const ids = guideStepIds(multiVisitGuide());
    const blocked = new Set(["fictional-quest:v2:s1"]);
    expect(advancePointer(ids, blocked, "fictional-quest:v1:s2")).toBe(
      "fictional-quest:v3:s1",
    );
  });
});

describe("chapterOf / visitOf", () => {
  it("finds the chapter and visit that mint a step, across visits", () => {
    const guide = multiVisitGuide();
    expect(chapterOf(guide, "fictional-quest:v2:s1")?.id).toBe(
      "fictional-quest:c1",
    );
    expect(visitOf(guide, "fictional-quest:v3:s1")?.id).toBe(
      "fictional-quest:v3",
    );
  });

  it("returns undefined for a null or unknown step", () => {
    const guide = multiVisitGuide();
    expect(chapterOf(guide, null)).toBeUndefined();
    expect(visitOf(guide, "fictional-quest:nope")).toBeUndefined();
  });
});
