import { describe, it } from "vitest";
import {
  chapterId,
  checkableId,
  guideFile,
  guideSlug,
  localId,
  locationId,
  stepId,
  visitId,
} from "../../src/schema";
import {
  expectParses,
  expectRejects,
  validChapter,
  validChecklist,
  validGuide,
  validStep,
} from "./helpers";

describe("stable-ID grammar (§20.3)", () => {
  it("accepts well-formed IDs of each class", () => {
    expectParses(guideSlug, "pokemon-crystal");
    expectParses(chapterId, "pokemon-crystal:c2");
    expectParses(stepId, "pokemon-crystal:c2:s14");
    expectParses(checkableId, "pokemon-crystal:badges:rising");
    expectParses(localId, "src-wiki");
  });

  it("accepts well-formed location and visit IDs (2-segment, like chapters)", () => {
    expectParses(locationId, "pokemon-crystal:azalea-town");
    expectParses(visitId, "pokemon-crystal:v-azalea-1");
  });

  it("rejects malformed location and visit IDs", () => {
    // Wrong segment count.
    expectRejects(locationId, "pokemon-crystal");
    expectRejects(locationId, "pokemon-crystal:azalea:town");
    expectRejects(visitId, "pokemon-crystal:azalea:1");
    // Uppercase / illegal characters.
    expectRejects(locationId, "pokemon-crystal:Azalea-Town");
    expectRejects(visitId, "pokemon-crystal:v_azalea_1");
    // Empty segments.
    expectRejects(locationId, "pokemon-crystal:");
    expectRejects(visitId, ":v-azalea-1");
  });

  it("rejects uppercase segments", () => {
    expectRejects(stepId, "Pokemon-Crystal:c2:s14");
  });

  it("rejects spaces and underscores", () => {
    expectRejects(stepId, "pokemon crystal:c2:s14");
    expectRejects(stepId, "pokemon_crystal:c2:s14");
  });

  it("rejects the wrong segment count", () => {
    expectRejects(stepId, "pokemon-crystal:s14");
    expectRejects(chapterId, "pokemon-crystal:c2:s14");
    expectRejects(guideSlug, "pokemon-crystal:c2");
    expectRejects(localId, "src:wiki");
  });

  it("rejects empty segments", () => {
    expectRejects(stepId, "pokemon-crystal::s14");
    expectRejects(stepId, ":c2:s14");
    expectRejects(chapterId, "pokemon-crystal:");
  });

  it("rejects dangling hyphens in a segment", () => {
    expectRejects(guideSlug, "-pokemon");
    expectRejects(guideSlug, "pokemon-");
  });
});

describe("guide-slug prefix invariant", () => {
  it("rejects a chapter ID carrying a foreign slug", () => {
    const value = validGuide();
    expectRejects(guideFile, {
      ...value,
      chapters: [{ ...value.chapters[0], id: "other-game:c1" }],
    });
  });

  it("rejects a step ID carrying a foreign slug", () => {
    expectRejects(guideFile, {
      ...validGuide(),
      chapters: [
        {
          ...validChapter(),
          steps: [{ ...validStep(1), id: "other-game:c1:s1" }, validStep(2)],
        },
      ],
    });
  });

  it("rejects a widget ID carrying a foreign slug", () => {
    expectRejects(guideFile, {
      ...validGuide(),
      widgets: [{ ...validChecklist(1), id: "other-game:w1" }],
    });
  });

  it("rejects a widget item ID carrying a foreign slug", () => {
    const w = validChecklist(1);
    expectRejects(guideFile, {
      ...validGuide(),
      widgets: [{ ...w, rows: [{ ...w.rows[0], itemId: "other-game:w1:r1" }] }],
    });
  });
});
