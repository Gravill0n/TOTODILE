import { describe, expect, it } from "vitest";
import { guideFile } from "../../src/schema";
import { preferredNextVisit } from "../../src/spine/preferredNext";

// One chapter, three visits — Harbor Town visited twice around a Sea Cave trip —
// so "next visit" can be exercised mid-visit, at a visit boundary, and at the
// very end.
function fixture() {
  const step = (id: string, order: number) => ({
    id,
    order,
    keywords: ["beat"],
    sourceRefs: ["src-x"],
    confidence: "normal" as const,
  });
  return guideFile.parse({
    schemaVersion: 1,
    guideId: "sample-quest",
    locations: [
      { id: "sample-quest:harbor-town", name: "Harbor Town" },
      { id: "sample-quest:sea-cave", name: "Sea Cave" },
    ],
    chapters: [
      {
        id: "sample-quest:c1",
        title: "Chapter 1",
        order: 0,
        visits: [
          {
            id: "sample-quest:v-harbor-1",
            locationId: "sample-quest:harbor-town",
            order: 0,
            steps: [
              step("sample-quest:v-harbor-1:s1", 0),
              step("sample-quest:v-harbor-1:s2", 1),
            ],
          },
          {
            id: "sample-quest:v-sea-1",
            locationId: "sample-quest:sea-cave",
            order: 1,
            steps: [step("sample-quest:v-sea-1:s1", 0)],
          },
          {
            id: "sample-quest:v-harbor-2",
            locationId: "sample-quest:harbor-town",
            order: 2,
            steps: [step("sample-quest:v-harbor-2:s1", 0)],
          },
        ],
      },
    ],
    widgets: [],
  });
}

describe("preferredNextVisit", () => {
  it("starts at the first visit when there is no current step", () => {
    expect(preferredNextVisit(fixture(), null)?.id).toBe(
      "sample-quest:v-harbor-1",
    );
  });

  it("stays on the current visit while its steps remain", () => {
    // pointer on s1 of harbor-1, s2 still ahead in the same visit
    expect(
      preferredNextVisit(fixture(), "sample-quest:v-harbor-1:s1")?.id,
    ).toBe("sample-quest:v-harbor-1");
  });

  it("moves to the next visit once the current visit is exhausted", () => {
    // pointer on the last step of harbor-1 → next is the Sea Cave visit
    expect(
      preferredNextVisit(fixture(), "sample-quest:v-harbor-1:s2")?.id,
    ).toBe("sample-quest:v-sea-1");
    // and across into the revisit
    expect(preferredNextVisit(fixture(), "sample-quest:v-sea-1:s1")?.id).toBe(
      "sample-quest:v-harbor-2",
    );
  });

  it("is undefined at the last step of the last visit", () => {
    expect(
      preferredNextVisit(fixture(), "sample-quest:v-harbor-2:s1"),
    ).toBeUndefined();
  });

  it("is undefined for an unknown step", () => {
    expect(preferredNextVisit(fixture(), "sample-quest:nope")).toBeUndefined();
  });
});
