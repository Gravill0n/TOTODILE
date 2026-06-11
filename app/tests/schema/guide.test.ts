import { describe, it } from "vitest";
import { guideFile } from "../../src/schema";
import {
  expectParses,
  expectRejects,
  validChapter,
  validChecklist,
  validGuide,
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
        { ...collision, rows: [{ ...collision.rows[0], itemId: "fic:c1:s1" }] },
      ],
    });
  });

  it("rejects a widget scoped to an unknown chapter", () => {
    expectRejects(guideFile, {
      ...validGuide(),
      widgets: [
        {
          ...validChecklist(1),
          scope: { kind: "chapter", chapterId: "fic:c99" },
        },
      ],
    });
  });
});
