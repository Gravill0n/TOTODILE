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

// A step hands over the widget rows the route ties to it (`stepRef`). The
// fan-out lives in these mutations so every way a step settles inherits it.
describe("a step's linked widget rows follow it", () => {
  // s1 hands over two rows; s2 hands over one; s3 hands over nothing.
  const links: Record<string, string[]> = {
    "g:c1:s1": ["g:w1:r1", "g:w1:r2"],
    "g:c1:s2": ["g:w2:r1"],
  };
  const linkedItems = (stepId: string) => links[stepId] ?? [];
  const state = (s: ProgressSlot, id: string) => s.itemStates[id]?.state;

  it("ticking the step ticks its rows, in the same write", () => {
    const next = toggleDone(slot(), STEPS, "g:c1:s1", AT, linkedItems);
    expect(state(next, "g:c1:s1")).toBe("done");
    expect(state(next, "g:w1:r1")).toBe("done");
    expect(state(next, "g:w1:r2")).toBe("done");
  });

  it("unticking the step takes them back", () => {
    const on = toggleDone(slot(), STEPS, "g:c1:s1", AT, linkedItems);
    const off = toggleDone(on, STEPS, "g:c1:s1", AT, linkedItems);
    expect(state(off, "g:c1:s1")).toBeUndefined();
    expect(state(off, "g:w1:r1")).toBeUndefined();
    expect(state(off, "g:w1:r2")).toBeUndefined();
  });

  it("leaves rows belonging to other steps alone", () => {
    const next = toggleDone(slot(), STEPS, "g:c1:s1", AT, linkedItems);
    expect(state(next, "g:w2:r1")).toBeUndefined();
  });

  // One direction only: a row is a thing found, a step is route walked.
  it("ticking a row never marks its step", () => {
    const next = toggleDone(slot(), STEPS, "g:w1:r1", AT, linkedItems);
    expect(state(next, "g:w1:r1")).toBe("done");
    expect(state(next, "g:c1:s1")).toBeUndefined();
  });

  it("a step with no links behaves exactly as before", () => {
    const withLinks = toggleDone(slot(), STEPS, "g:c1:s3", AT, linkedItems);
    const without = toggleDone(slot(), STEPS, "g:c1:s3", AT);
    expect(withLinks).toEqual(without);
  });

  it("the burst hands over the rows of every step it settles", () => {
    const next = markThrough(slot(), STEPS, "g:c1:s2", AT, linkedItems);
    expect(state(next, "g:w1:r1")).toBe("done");
    expect(state(next, "g:w2:r1")).toBe("done");
  });

  // The burst spares a deliberate skip, so its rows are spared with it.
  it("the burst skips the rows of a step it deliberately steps over", () => {
    const skipped = toggleSkip(slot(), STEPS, "g:c1:s1", AT);
    const next = markThrough(skipped, STEPS, "g:c1:s2", AT, linkedItems);
    expect(state(next, "g:c1:s1")).toBe("skipped");
    expect(state(next, "g:w1:r1")).toBeUndefined();
    expect(state(next, "g:w2:r1")).toBe("done");
  });

  it("an RA unlock on a step hands over its rows too", () => {
    const next = markManyDone(slot(), ["g:c1:s1"], AT, linkedItems);
    expect(state(next, "g:w1:r1")).toBe("done");
  });

  // FR-C2: sync is additive. It may mark, never un-mark.
  it("sync never un-marks through the links", () => {
    const before = slot({
      itemStates: { "g:w1:r1": { state: "done", at: AT } },
    });
    const next = markManyDone(before, ["g:c1:s1"], AT, linkedItems);
    expect(state(next, "g:w1:r1")).toBe("done");
  });
});
