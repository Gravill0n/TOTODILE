import { describe, expect, it } from "vitest";
import { progressExport, progressSlot } from "@/schema";
import {
  expectParses,
  expectRejects,
  validProgressExport,
  validProgressSlot,
} from "@/testing/helpers";

describe("progressSlot", () => {
  it("parses a populated slot", () => {
    expectParses(progressSlot, validProgressSlot());
  });

  it("parses a fresh slot with a null pointer", () => {
    expectParses(progressSlot, {
      ...validProgressSlot(),
      currentStepId: null,
      itemStates: {},
      counterValues: {},
    });
  });

  it("rejects an unknown item state", () => {
    expectRejects(progressSlot, {
      ...validProgressSlot(),
      itemStates: {
        "fictional-quest:c1:s1": { state: "maybe", at: "2026-06-12T08:00:00Z" },
      },
    });
  });

  it("rejects a non-checkable item-state key", () => {
    expectRejects(progressSlot, {
      ...validProgressSlot(),
      itemStates: {
        "fictional-quest:c1": {
          state: "done",
          at: "2026-06-12T08:00:00Z",
        },
      },
    });
  });

  it("rejects negative counter values", () => {
    expectRejects(progressSlot, {
      ...validProgressSlot(),
      counterValues: { "fictional-quest:counters:blue-coins": -1 },
    });
  });

  it("rejects a missing stats block", () => {
    const { stats, ...slot } = validProgressSlot();
    expectRejects(progressSlot, slot);
  });

  it("defaults acknowledgedMissables to [] for slots written before the field (FR-B5)", () => {
    const { acknowledgedMissables, ...slot } = validProgressSlot();
    const parsed = progressSlot.parse(slot);
    expect(parsed.acknowledgedMissables).toEqual([]);
  });
});

describe("progressExport (FR-B6 — part of the §8.2 contract)", () => {
  it("parses a valid export", () => {
    expectParses(progressExport, validProgressExport());
  });

  it("parses an export with no slots", () => {
    expectParses(progressExport, { ...validProgressExport(), slots: [] });
  });

  it("rejects a wrong kind marker", () => {
    expectRejects(progressExport, {
      ...validProgressExport(),
      kind: "totodile-settings",
    });
  });

  it("rejects an unsupported schema version", () => {
    expectRejects(progressExport, {
      ...validProgressExport(),
      schemaVersion: 999,
    });
  });

  it("rejects a malformed exportedAt", () => {
    expectRejects(progressExport, {
      ...validProgressExport(),
      exportedAt: "yesterday",
    });
  });
});
