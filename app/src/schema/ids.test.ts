import { describe, expect, it } from "vitest";
import {
  chapterId,
  checkableId,
  guideFile,
  guideSlug,
  idSlug,
  idTail,
  localId,
  locationId,
  qualifyId,
  stepId,
  visitId,
} from "@/schema";
import {
  expectParses,
  expectRejects,
  validChapter,
  validChecklist,
  validGuide,
  validLocation,
} from "@/testing/helpers";

// URLs carry the tail, not the whole ID: /guide/zelda-oot/chapter/c4 reads
// better than the slug repeated, and the slug is already in the path.
describe("ID slug and tail", () => {
  it("splits an ID into its slug and its guide-local tail", () => {
    expect(idSlug("zelda-oot:v-kakariko-village-5")).toBe("zelda-oot");
    expect(idTail("zelda-oot:v-kakariko-village-5")).toBe(
      "v-kakariko-village-5",
    );
  });

  it("keeps every segment after the slug for 3-segment IDs", () => {
    expect(idTail("zelda-oot:v-kakariko-village-5:s1")).toBe(
      "v-kakariko-village-5:s1",
    );
  });

  it("round-trips through qualifyId", () => {
    const id = "zelda-oot:c4";
    expect(qualifyId(idSlug(id), idTail(id))).toBe(id);
  });

  it("returns an empty tail for an ID with no colon", () => {
    expect(idTail("zelda-oot")).toBe("");
  });
});

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
    const chapter = structuredClone(validChapter());
    const step = chapter.visits[0]?.steps[0];
    if (step) step.id = "other-game:c1:s1";
    expectRejects(guideFile, { ...validGuide(), chapters: [chapter] });
  });

  it("rejects a visit ID carrying a foreign slug", () => {
    const chapter = structuredClone(validChapter());
    const visit = chapter.visits[0];
    if (visit) visit.id = "other-game:v1";
    expectRejects(guideFile, { ...validGuide(), chapters: [chapter] });
  });

  it("rejects a location ID carrying a foreign slug", () => {
    expectRejects(guideFile, {
      ...validGuide(),
      locations: [{ ...validLocation(), id: "other-game:castle-gate" }],
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
