import { describe, expect, it } from "vitest";
import { guideFile } from "@/schema";
import { buildLocationIndex } from "@/spine/locationIndex";

// A guide where Harbor Town is visited twice (a revisit) with a global, a
// harbor-scoped and a cave-scoped widget, so the index has to aggregate steps
// across both harbor visits, pick only the harbor-scoped widget, and union the
// achievements earnable there.
function fixture() {
  const step = (id: string, achievementRefs: number[] = []) => ({
    id,
    order: 0,
    keywords: ["do a thing"],
    achievementRefs,
    sourceRefs: ["src-x"],
    confidence: "normal" as const,
  });
  const listWidget = (
    seg: string,
    position: number,
    scope: Record<string, unknown>,
  ) => ({
    id: `sample-quest:${seg}`,
    type: "checklist" as const,
    title: seg,
    scope,
    deckPosition: position,
    rows: [
      {
        itemId: `sample-quest:${seg}:r1`,
        label: "row",
        sourceRefs: ["src-x"],
        confidence: "normal" as const,
      },
    ],
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
              { ...step("sample-quest:v-harbor-1:s1", [10]) },
              { ...step("sample-quest:v-harbor-1:s2"), order: 1 },
            ],
          },
          {
            id: "sample-quest:v-sea-1",
            locationId: "sample-quest:sea-cave",
            order: 1,
            steps: [step("sample-quest:v-sea-1:s1")],
          },
          {
            id: "sample-quest:v-harbor-2",
            locationId: "sample-quest:harbor-town",
            order: 2,
            steps: [step("sample-quest:v-harbor-2:s1", [11])],
          },
        ],
      },
    ],
    widgets: [
      listWidget("harbor-list", 0, {
        kind: "location",
        locationId: "sample-quest:harbor-town",
      }),
      listWidget("cave-list", 1, {
        kind: "location",
        locationId: "sample-quest:sea-cave",
      }),
      listWidget("global-list", 2, { kind: "global" }),
    ],
  });
}

describe("buildLocationIndex", () => {
  it("has one entry per declared location", () => {
    const index = buildLocationIndex(fixture());
    expect([...index.keys()].sort()).toEqual([
      "sample-quest:harbor-town",
      "sample-quest:sea-cave",
    ]);
  });

  it("aggregates every visit and step across a revisit, in spine order", () => {
    const harbor = buildLocationIndex(fixture()).get(
      "sample-quest:harbor-town",
    );
    expect(harbor?.visits.map((v) => v.id)).toEqual([
      "sample-quest:v-harbor-1",
      "sample-quest:v-harbor-2",
    ]);
    expect(harbor?.steps.map((s) => s.id)).toEqual([
      "sample-quest:v-harbor-1:s1",
      "sample-quest:v-harbor-1:s2",
      "sample-quest:v-harbor-2:s1",
    ]);
  });

  it("includes only the location-scoped widgets for that place", () => {
    const harbor = buildLocationIndex(fixture()).get(
      "sample-quest:harbor-town",
    );
    expect(harbor?.widgets.map((w) => w.id)).toEqual([
      "sample-quest:harbor-list",
    ]);
  });

  it("unions the achievements earnable across the location's visits", () => {
    const harbor = buildLocationIndex(fixture()).get(
      "sample-quest:harbor-town",
    );
    expect([...(harbor?.achievementRefs ?? [])].sort((a, b) => a - b)).toEqual([
      10, 11,
    ]);
  });

  it("scopes widgets per location — sea-cave gets its own, not harbor's or the global one", () => {
    const cave = buildLocationIndex(fixture()).get("sample-quest:sea-cave");
    expect(cave?.widgets.map((w) => w.id)).toEqual(["sample-quest:cave-list"]);
    expect(cave?.steps.map((s) => s.id)).toEqual(["sample-quest:v-sea-1:s1"]);
  });
});
