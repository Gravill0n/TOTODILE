import { describe, it } from "vitest";
import { chapter, step } from "../../src/schema";
import {
  expectParses,
  expectRejects,
  validChapter,
  validStep,
} from "./helpers";

describe("step", () => {
  it("parses a full step", () => {
    expectParses(step, validStep());
  });

  it("parses a minimal step (no location, missable, achievements, images)", () => {
    const { location, missable, achievementRefs, images, ...minimal } =
      validStep();
    expectParses(step, minimal);
  });

  it("rejects a step without source references (§6.6 invariant)", () => {
    expectRejects(step, { ...validStep(), sourceRefs: [] });
  });

  it("rejects an unknown confidence level", () => {
    expectRejects(step, { ...validStep(), confidence: "maybe" });
  });

  it("rejects empty instruction text", () => {
    expectRejects(step, { ...validStep(), text: "" });
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

describe("chapter", () => {
  it("parses a valid chapter", () => {
    expectParses(chapter, validChapter());
  });

  it("rejects a chapter with no steps", () => {
    expectRejects(chapter, { ...validChapter(), steps: [] });
  });

  it("rejects duplicate step IDs", () => {
    const duplicate = validChapter();
    duplicate.steps = [
      validStep(1),
      { ...validStep(2), id: "fictional-quest:c1:s1" },
    ];
    expectRejects(chapter, duplicate);
  });

  it("rejects duplicate step orders", () => {
    const duplicate = validChapter();
    duplicate.steps = [validStep(1), { ...validStep(2), order: 0 }];
    expectRejects(chapter, duplicate);
  });
});
