import { describe, it } from "vitest";
import { guideFile } from "../../src/schema";
import {
  expectParses,
  expectRejects,
  validChapter,
  validChecklist,
  validGuide,
  validLocation,
} from "./helpers";

describe("guideFile", () => {
  it("parses a guide exercising all 7 primitives", () => {
    expectParses(guideFile, validGuide());
  });

  it("parses a spine-only guide (widgets default to empty)", () => {
    const { widgets, ...spineOnly } = validGuide();
    expectParses(guideFile, spineOnly);
  });

  it("rejects a wrong schema version", () => {
    expectRejects(guideFile, { ...validGuide(), schemaVersion: 999 });
  });

  it("rejects a guide with no chapters", () => {
    expectRejects(guideFile, { ...validGuide(), chapters: [] });
  });

  it("rejects duplicate chapter IDs", () => {
    const value = validGuide();
    expectRejects(guideFile, {
      ...value,
      chapters: [validChapter(), { ...validChapter(), order: 1 }],
    });
  });

  it("rejects duplicate widget IDs", () => {
    const value = validGuide();
    expectRejects(guideFile, {
      ...value,
      widgets: [validChecklist(1), validChecklist(1)],
    });
  });

  it("rejects a widget item ID colliding with a step ID — one checkable namespace", () => {
    const collision = validChecklist(1);
    expectRejects(guideFile, {
      ...validGuide(),
      widgets: [
        {
          ...collision,
          rows: [{ ...collision.rows[0], itemId: "fictional-quest:c1:s1" }],
        },
      ],
    });
  });

  it("rejects a widget scoped to an unknown chapter", () => {
    expectRejects(guideFile, {
      ...validGuide(),
      widgets: [
        {
          ...validChecklist(1),
          scope: { kind: "chapter", chapterId: "fictional-quest:c99" },
        },
      ],
    });
  });

  it("accepts a widget scoped to a known location and visit", () => {
    expectParses(guideFile, {
      ...validGuide(),
      widgets: [
        {
          ...validChecklist(1),
          scope: {
            kind: "location",
            locationId: "fictional-quest:castle-gate",
          },
        },
        {
          ...validChecklist(2),
          scope: { kind: "visit", visitId: "fictional-quest:v1" },
        },
      ],
    });
  });

  it("rejects a widget scoped to an unknown location", () => {
    expectRejects(guideFile, {
      ...validGuide(),
      widgets: [
        {
          ...validChecklist(1),
          scope: { kind: "location", locationId: "fictional-quest:nowhere" },
        },
      ],
    });
  });

  it("rejects a widget scoped to an unknown visit", () => {
    expectRejects(guideFile, {
      ...validGuide(),
      widgets: [
        {
          ...validChecklist(1),
          scope: { kind: "visit", visitId: "fictional-quest:v99" },
        },
      ],
    });
  });

  it("rejects a visit referencing an unknown location", () => {
    const value = validGuide();
    const chapter = structuredClone(validChapter());
    const visit = chapter.visits[0];
    if (visit) visit.locationId = "fictional-quest:nowhere";
    expectRejects(guideFile, { ...value, chapters: [chapter] });
  });

  it("rejects duplicate location IDs", () => {
    const value = validGuide();
    expectRejects(guideFile, {
      ...value,
      locations: [validLocation(), validLocation()],
    });
  });

  it("rejects duplicate visit IDs across chapters", () => {
    const value = validGuide();
    const second = structuredClone(validChapter());
    second.id = "fictional-quest:c2";
    second.order = 1;
    // second chapter reuses visit id "fictional-quest:v1" from chapter 1
    expectRejects(guideFile, {
      ...value,
      chapters: [validChapter(), second],
    });
  });
});
