import { describe, expect, it } from "vitest";
import { widgetContextFor, widgetInScope } from "@/features/spine/widgetScope";
import type { WidgetScope } from "@/schema";
import { guideFile } from "@/schema";

const global: WidgetScope = { kind: "global" };
const chapter: WidgetScope = { kind: "chapter", chapterId: "g:c1" };
const atHarbor: WidgetScope = { kind: "location", locationId: "g:harbor" };
const onVisit1: WidgetScope = { kind: "visit", visitId: "g:v-harbor-1" };

// Two visits to the same location (harbor), so a location-scoped widget must
// show in both contexts while a visit-scoped one shows in only its own.
const inVisit1 = {
  chapterId: "g:c1",
  locationId: "g:harbor",
  visitId: "g:v-harbor-1",
};
const inVisit2 = {
  chapterId: "g:c1",
  locationId: "g:harbor",
  visitId: "g:v-harbor-2",
};

describe("widgetInScope", () => {
  it("global widgets are always in scope", () => {
    expect(widgetInScope(global, inVisit1)).toBe(true);
    expect(widgetInScope(global, { ...inVisit1, chapterId: undefined })).toBe(
      true,
    );
  });

  it("chapter widgets match the current chapter", () => {
    expect(widgetInScope(chapter, inVisit1)).toBe(true);
    expect(widgetInScope(chapter, { ...inVisit1, chapterId: "g:c2" })).toBe(
      false,
    );
  });

  it("location widgets show on every visit to the location", () => {
    expect(widgetInScope(atHarbor, inVisit1)).toBe(true);
    expect(widgetInScope(atHarbor, inVisit2)).toBe(true);
    expect(widgetInScope(atHarbor, { ...inVisit1, locationId: "g:cave" })).toBe(
      false,
    );
  });

  it("visit widgets show only on their own visit, not a sibling visit there", () => {
    expect(widgetInScope(onVisit1, inVisit1)).toBe(true);
    expect(widgetInScope(onVisit1, inVisit2)).toBe(false);
  });
});

describe("widgetContextFor", () => {
  const guide = guideFile.parse({
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
            steps: [
              {
                id: "g:v-harbor-1:s1",
                order: 0,
                keywords: ["x"],
                sourceRefs: ["s"],
                confidence: "normal",
              },
            ],
          },
        ],
      },
    ],
    widgets: [],
  });

  it("derives chapter/location/visit from the displayed visit", () => {
    expect(widgetContextFor(guide, "g:v-harbor-1")).toEqual({
      chapterId: "g:c1",
      locationId: "g:harbor",
      visitId: "g:v-harbor-1",
    });
  });

  // The pointer's own visit is no longer the input, so a reader browsing two
  // chapters ahead of where they are gets the widgets of the page they are
  // looking at. Passing a step id — the old argument — must not resolve.
  it("is all-undefined for no visit, or for something that is not one", () => {
    const empty = {
      chapterId: undefined,
      locationId: undefined,
      visitId: undefined,
    };
    expect(widgetContextFor(guide, null)).toEqual(empty);
    expect(widgetContextFor(guide, "g:v-harbor-1:s1")).toEqual(empty);
  });
});
