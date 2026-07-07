import { describe, expect, it } from "vitest";
import {
  adjustCounter,
  markManyDone,
  markThrough,
  toggleDone,
  toggleSkip,
} from "@/features/progress/slotMutations";
import type { ProgressSlot } from "@/schema";

const STEPS = ["g:c1:s1", "g:c1:s2", "g:c1:s3", "g:c2:s1"] as const;
const AT = "2026-07-07T00:00:00.000Z";

function slot(overrides: Partial<ProgressSlot> = {}): ProgressSlot {
  return {
    guideId: "g",
    currentStepId: "g:c1:s1",
    itemStates: {},
    counterValues: {},
    acknowledgedMissables: [],
    stats: { stepsDone: 0, stepsTotal: 4, currentChapterTitle: null },
    lastActivityAt: AT,
    ...overrides,
  };
}

describe("slotMutations (pure)", () => {
  it("toggleDone marks done with the given timestamp and advances a current step", () => {
    const next = toggleDone(slot(), [...STEPS], "g:c1:s1", AT);
    expect(next.itemStates["g:c1:s1"]).toEqual({ state: "done", at: AT });
    expect(next.currentStepId).toBe("g:c1:s2");
  });

  it("toggleDone un-marks a done item and never moves the pointer", () => {
    const done = toggleDone(slot(), [...STEPS], "g:c1:s1", AT);
    const undone = toggleDone(done, [...STEPS], "g:c1:s1", AT);
    expect(undone.itemStates["g:c1:s1"]).toBeUndefined();
    expect(undone.currentStepId).toBe("g:c1:s2");
  });

  it("toggleSkip is a no-op on a done step", () => {
    const done = toggleDone(slot(), [...STEPS], "g:c1:s1", AT);
    expect(toggleSkip(done, [...STEPS], "g:c1:s1", AT)).toBe(done);
  });

  it("markThrough fills the range but preserves deliberate skips", () => {
    const skipped = toggleSkip(slot(), [...STEPS], "g:c1:s2", AT);
    const next = markThrough(skipped, [...STEPS], "g:c1:s3", AT);
    expect(next.itemStates["g:c1:s1"]?.state).toBe("done");
    expect(next.itemStates["g:c1:s2"]?.state).toBe("skipped");
    expect(next.itemStates["g:c1:s3"]?.state).toBe("done");
    expect(next.currentStepId).toBe("g:c2:s1");
  });

  it("markManyDone overrides skips, never un-marks, leaves the pointer", () => {
    const skipped = toggleSkip(slot(), [...STEPS], "g:c1:s2", AT);
    const next = markManyDone(skipped, ["g:c1:s2", "g:c1:s3"], AT);
    expect(next.itemStates["g:c1:s2"]?.state).toBe("done");
    expect(next.itemStates["g:c1:s3"]?.state).toBe("done");
    expect(next.currentStepId).toBe("g:c1:s1");
  });

  it("adjustCounter floors at zero", () => {
    const next = adjustCounter(slot(), "g:w1:kills", -5);
    expect(next.counterValues["g:w1:kills"]).toBe(0);
  });

  it("never mutates the input slot", () => {
    const before = slot();
    const frozen = JSON.stringify(before);
    toggleDone(before, [...STEPS], "g:c1:s1", AT);
    markThrough(before, [...STEPS], "g:c1:s3", AT);
    adjustCounter(before, "x", 3);
    expect(JSON.stringify(before)).toBe(frozen);
  });
});
