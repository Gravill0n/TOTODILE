import { describe, it } from "vitest";
import {
  expectParses,
  expectRejects,
  validChapter,
  validLocation,
  validStep,
  validVisit,
} from "@/testing/helpers";
import { chapter, location, step, visit } from "../../src/schema";

describe("step", () => {
  it("parses a full step", () => {
    expectParses(step, validStep());
  });

  it("parses a minimal step (keywords only)", () => {
    const { detail, missable, achievementRefs, images, ...minimal } =
      validStep();
    expectParses(step, minimal);
  });

  it("requires at least one keyword beat (#11)", () => {
    expectRejects(step, { ...validStep(), keywords: [] });
  });

  it("rejects an empty keyword beat", () => {
    expectRejects(step, { ...validStep(), keywords: ["", "ok"] });
  });

  it("rejects an empty detail string", () => {
    expectRejects(step, { ...validStep(), detail: "" });
  });

  it("rejects the removed free-text location field's old role by ignoring it", () => {
    // `location`/`text`/`section` are gone; Zod strips unknown keys, so a stray
    // one parses (the step is still valid) but carries no meaning.
    expectParses(step, {
      ...validStep(),
      location: "Castle Gate",
      text: "old prose",
    });
  });

  it("rejects a step without source references (§6.6 invariant)", () => {
    expectRejects(step, { ...validStep(), sourceRefs: [] });
  });

  it("rejects an unknown confidence level", () => {
    expectRejects(step, { ...validStep(), confidence: "maybe" });
  });

  it("rejects a negative order", () => {
    expectRejects(step, { ...validStep(), order: -1 });
  });

  it("rejects a missable flag without a deadline description", () => {
    expectRejects(step, { ...validStep(), missable: {} });
  });

  it("rejects non-integer achievement references", () => {
    expectRejects(step, { ...validStep(), achievementRefs: ["101"] });
  });
});

describe("location", () => {
  it("parses a full location", () => {
    expectParses(location, validLocation());
  });

  it("parses a location without a map image", () => {
    const { mapImage, ...minimal } = validLocation();
    expectParses(location, minimal);
  });

  it("rejects a malformed location ID", () => {
    expectRejects(location, { ...validLocation(), id: "fictional-quest" });
  });

  it("rejects an empty name", () => {
    expectRejects(location, { ...validLocation(), name: "" });
  });
});

describe("visit", () => {
  it("parses a valid visit", () => {
    expectParses(visit, validVisit());
  });

  it("rejects a visit with no steps", () => {
    expectRejects(visit, { ...validVisit(), steps: [] });
  });

  it("rejects a malformed locationId FK shape", () => {
    expectRejects(visit, { ...validVisit(), locationId: "castle-gate" });
  });

  it("rejects duplicate step IDs within the visit", () => {
    const duplicate = validVisit();
    duplicate.steps = [
      validStep(1),
      { ...validStep(2), id: "fictional-quest:c1:s1" },
    ];
    expectRejects(visit, duplicate);
  });

  it("rejects duplicate step orders within the visit", () => {
    const duplicate = validVisit();
    duplicate.steps = [validStep(1), { ...validStep(2), order: 0 }];
    expectRejects(visit, duplicate);
  });
});

describe("chapter", () => {
  it("parses a valid chapter", () => {
    expectParses(chapter, validChapter());
  });

  it("parses an intro paragraph", () => {
    expectParses(chapter, {
      ...validChapter(),
      intro: "The gate town at dawn.",
    });
  });

  it("rejects an empty intro", () => {
    expectRejects(chapter, { ...validChapter(), intro: "" });
  });

  it("rejects a chapter with no visits", () => {
    expectRejects(chapter, { ...validChapter(), visits: [] });
  });

  it("rejects duplicate visit IDs", () => {
    const duplicate = validChapter();
    duplicate.visits = [
      validVisit(),
      { ...validVisit(), id: "fictional-quest:v1" },
    ];
    expectRejects(chapter, duplicate);
  });

  it("rejects duplicate visit orders", () => {
    const duplicate = validChapter();
    duplicate.visits = [
      validVisit(),
      { ...validVisit(), id: "fictional-quest:v2", order: 0 },
    ];
    expectRejects(chapter, duplicate);
  });
});
