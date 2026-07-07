import { describe, expect, it } from "vitest";
import type { RaMappingEntry } from "@/schema";
import { computeSync } from "@/sync/syncReceipt";

function entry(raAchievementId: number, targetItemId: string): RaMappingEntry {
  return {
    raAchievementId,
    targetItemId,
    sourceRefs: ["src-wiki"],
    confidence: "normal",
  };
}

const entries: RaMappingEntry[] = [
  entry(101, "fictional-quest:c1:s1"),
  entry(102, "fictional-quest:w1:r1"),
  // Shares a target with 101 — two achievements, one item.
  entry(103, "fictional-quest:c1:s1"),
];

describe("computeSync (FR-C3)", () => {
  it("buckets a mixed unlock set; counts sum to the unlock total", () => {
    const { receipt, toMark } = computeSync(
      [101, 102, 999],
      entries,
      new Set(),
    );
    expect(receipt).toEqual({ newlyMarked: 2, alreadyDone: 0, unmapped: 1 });
    expect(new Set(toMark)).toEqual(
      new Set(["fictional-quest:c1:s1", "fictional-quest:w1:r1"]),
    );
    expect(receipt.newlyMarked + receipt.alreadyDone + receipt.unmapped).toBe(
      3,
    );
  });

  it("counts an already-done target separately and marks nothing", () => {
    const { receipt, toMark } = computeSync(
      [101],
      entries,
      new Set(["fictional-quest:c1:s1"]),
    );
    expect(receipt).toEqual({ newlyMarked: 0, alreadyDone: 1, unmapped: 0 });
    expect(toMark).toEqual([]);
  });

  it("de-dupes the write set when achievements share a target", () => {
    const { receipt, toMark } = computeSync([101, 103], entries, new Set());
    expect(receipt.newlyMarked).toBe(2);
    expect(toMark).toEqual(["fictional-quest:c1:s1"]);
  });
});
