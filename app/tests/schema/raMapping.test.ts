import { describe, it } from "vitest";
import { expectParses, expectRejects, validRaMapping } from "@/testing/helpers";
import { raMapping } from "../../src/schema";

function entry(raAchievementId: number, targetItemId: string) {
  return {
    raAchievementId,
    targetItemId,
    sourceRefs: ["src-wiki"],
    confidence: "normal",
  };
}

describe("raMapping", () => {
  it("parses a valid mapping", () => {
    expectParses(raMapping, validRaMapping());
  });

  it("parses an empty mapping — unmapped achievements are legal (§6.5)", () => {
    expectParses(raMapping, { ...validRaMapping(), entries: [] });
  });

  it("allows two achievements targeting the same item", () => {
    expectParses(raMapping, {
      ...validRaMapping(),
      entries: [
        entry(101, "fictional-quest:c1:s1"),
        entry(102, "fictional-quest:c1:s1"),
      ],
    });
  });

  it("rejects the same RA achievement mapped twice", () => {
    expectRejects(raMapping, {
      ...validRaMapping(),
      entries: [
        entry(101, "fictional-quest:c1:s1"),
        entry(101, "fictional-quest:c1:s2"),
      ],
    });
  });

  it("rejects a non-integer RA achievement ID", () => {
    expectRejects(raMapping, {
      ...validRaMapping(),
      entries: [
        { ...entry(101, "fictional-quest:c1:s1"), raAchievementId: "101" },
      ],
    });
  });

  it("rejects an entry without sourceRefs or confidence (FR-D2)", () => {
    const { sourceRefs, ...noRefs } = entry(101, "fictional-quest:c1:s1");
    expectRejects(raMapping, { ...validRaMapping(), entries: [noRefs] });
    const { confidence, ...noConfidence } = entry(101, "fictional-quest:c1:s1");
    expectRejects(raMapping, { ...validRaMapping(), entries: [noConfidence] });
  });

  it("rejects a missing RA game ID", () => {
    const { raGameId, ...value } = validRaMapping();
    expectRejects(raMapping, value);
  });
});
