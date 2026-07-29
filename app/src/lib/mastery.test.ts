import { describe, expect, it } from "vitest";
import { doneIdsOf, mastery } from "@/lib/mastery";
import { raMapping as raMappingSchema } from "@/schema";
import { validProgressSlot, validRaMapping } from "@/testing/helpers";

describe("mastery (§7 S4)", () => {
  it("counts an achievement as earned when its mapped target is done", () => {
    const map = raMappingSchema.parse(validRaMapping());
    expect(mastery(map, new Set(["fictional-quest:c1:s1"]))).toEqual({
      earned: 1,
      total: map.entries.length,
    });
  });

  it("is null for a guide with no RA set", () => {
    expect(mastery(null, new Set())).toBeNull();
  });

  it("is null for an RA mapping that maps nothing", () => {
    const map = raMappingSchema.parse({ ...validRaMapping(), entries: [] });
    expect(mastery(map, new Set())).toBeNull();
  });
});

describe("doneIdsOf", () => {
  it("keeps done items and drops skipped ones", () => {
    const done = doneIdsOf(validProgressSlot());
    expect(done.has("fictional-quest:c1:s1")).toBe(true);
    expect(done.has("fictional-quest:c2:s3")).toBe(false);
  });

  it("is empty for a guide with no progress", () => {
    expect(doneIdsOf(undefined).size).toBe(0);
    expect(doneIdsOf({ ...validProgressSlot(), itemStates: {} }).size).toBe(0);
  });
});
