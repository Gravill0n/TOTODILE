import { describe, it } from "vitest";
import { raMapping } from "../../src/schema";
import { expectParses, expectRejects, validRaMapping } from "./helpers";

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
        { raAchievementId: 101, targetItemId: "fic:c1:s1" },
        { raAchievementId: 102, targetItemId: "fic:c1:s1" },
      ],
    });
  });

  it("rejects the same RA achievement mapped twice", () => {
    expectRejects(raMapping, {
      ...validRaMapping(),
      entries: [
        { raAchievementId: 101, targetItemId: "fic:c1:s1" },
        { raAchievementId: 101, targetItemId: "fic:c1:s2" },
      ],
    });
  });

  it("rejects a non-integer RA achievement ID", () => {
    expectRejects(raMapping, {
      ...validRaMapping(),
      entries: [{ raAchievementId: "101", targetItemId: "fic:c1:s1" }],
    });
  });

  it("rejects a missing RA game ID", () => {
    const { raGameId, ...value } = validRaMapping();
    expectRejects(raMapping, value);
  });
});
