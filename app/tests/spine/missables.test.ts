import { describe, expect, it } from "vitest";
import { guideFile, SCHEMA_VERSION } from "../../src/schema";
import { upcomingMissables } from "../../src/spine/missables";
import { validGuide } from "../schema/helpers";

function missableStep(id: string) {
  return {
    id,
    order: 0,
    text: id,
    missable: { deadline: `deadline ${id}` },
    sourceRefs: ["src-wiki"],
    confidence: "normal" as const,
  };
}

const threeChapters = guideFile.parse({
  schemaVersion: SCHEMA_VERSION,
  guideId: "fictional-quest",
  chapters: [
    {
      id: "fictional-quest:c1",
      title: "One",
      order: 0,
      steps: [missableStep("fictional-quest:c1:s1")],
    },
    {
      id: "fictional-quest:c2",
      title: "Two",
      order: 1,
      steps: [missableStep("fictional-quest:c2:s1")],
    },
    {
      id: "fictional-quest:c3",
      title: "Three",
      order: 2,
      steps: [missableStep("fictional-quest:c3:s1")],
    },
  ],
  widgets: [],
});

// validGuide's chapter c1 has two steps, both missable (validStep).
const guide = guideFile.parse(validGuide());
const S1 = "fictional-quest:c1:s1";
const S2 = "fictional-quest:c1:s2";

const ids = (
  current: string | null,
  done = new Set<string>(),
  ack = new Set<string>(),
) => upcomingMissables(guide, current, done, ack).map((m) => m.stepId);

describe("upcomingMissables (FR-B5/P3)", () => {
  it("returns missables strictly ahead of the current step", () => {
    expect(ids(S1)).toEqual([S2]); // the current step's own missable is excluded
  });

  it("lists everything ahead when there is no current step", () => {
    expect(ids(null)).toEqual([S1, S2]);
  });

  it("excludes done and acknowledged missables", () => {
    expect(ids(S1, new Set([S2]))).toEqual([]);
    expect(ids(S1, new Set(), new Set([S2]))).toEqual([]);
  });

  it("carries the deadline and location", () => {
    const first = upcomingMissables(guide, S1, new Set(), new Set())[0];
    expect(first?.deadline).toBe("Before raising the drawbridge in chapter 2");
    expect(first?.location).toBe("Castle Gate");
  });

  it("windows to the current and next chapter, not the whole game (§7)", () => {
    // In chapter 1: the chapter-2 missable shows, the chapter-3 one does not.
    const seen = upcomingMissables(
      threeChapters,
      "fictional-quest:c1:s1",
      new Set(),
      new Set(),
    ).map((m) => m.stepId);
    expect(seen).toEqual(["fictional-quest:c2:s1"]);
  });
});
