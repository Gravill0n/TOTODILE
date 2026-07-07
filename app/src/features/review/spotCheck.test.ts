import { describe, expect, it } from "vitest";
import {
  buildContentIndex,
  type FlaggedRow,
} from "@/features/review/flaggedRows";
import type { LayerReport } from "@/features/review/layerRoster";
import {
  groupUnflaggedRows,
  layerUnflaggedRows,
  owningWidgetLayerId,
  sampleRows,
} from "@/features/review/spotCheck";
import { guideFile, raMapping as raMappingSchema } from "@/schema";
import { validGuide, validRaMapping } from "@/testing/helpers";

const guide = guideFile.parse(validGuide());
const index = buildContentIndex(guide);
const mapping = raMappingSchema.parse(validRaMapping());

function layer(
  id: string,
  kind: LayerReport["kind"],
  flaggedItemIds: string[],
): LayerReport {
  return {
    id,
    kind,
    rowCount: 0,
    anomalies: [],
    flaggedItemIds,
    contentHash: `sha256:${"a".repeat(64)}`,
  };
}

describe("layerUnflaggedRows", () => {
  it("excludes the flagged steps from a spine layer", () => {
    const rows = layerUnflaggedRows(
      layer("spine", "spine", ["fictional-quest:c1:s2"]),
      index,
      guide,
      null,
    );
    expect(rows.map((r) => r.itemId)).toEqual(["fictional-quest:c1:s1"]);
  });

  it("reads a widget layer's rows from the matching widget id", () => {
    const rows = layerUnflaggedRows(
      layer("widget-w1", "widget", []),
      index,
      guide,
      null,
    );
    expect(rows.map((r) => r.itemId)).toEqual(["fictional-quest:w1:r1"]);
  });

  it("excludes flagged ra-mapping targets, keying rows on the target", () => {
    const rows = layerUnflaggedRows(
      layer("ra-mapping", "ra-mapping", ["fictional-quest:c1:s1"]),
      index,
      guide,
      mapping,
    );
    expect(rows.map((r) => r.itemId)).toEqual(["fictional-quest:w1:r1"]);
    expect(rows[0]?.title).toMatch(/^RA #102 → /);
  });
});

describe("groupUnflaggedRows", () => {
  it("unions the members' unflagged pools in member order", () => {
    const rows = groupUnflaggedRows(
      [layer("widget-w1", "widget", []), layer("widget-w4", "widget", [])],
      index,
      guide,
      null,
    );
    expect(rows.map((r) => r.itemId)).toEqual([
      "fictional-quest:w1:r1",
      "fictional-quest:w4:coins",
    ]);
  });

  it("excludes each member's own flagged rows from the pool", () => {
    const rows = groupUnflaggedRows(
      [
        layer("widget-w1", "widget", ["fictional-quest:w1:r1"]),
        layer("widget-w4", "widget", []),
      ],
      index,
      guide,
      null,
    );
    expect(rows.map((r) => r.itemId)).toEqual(["fictional-quest:w4:coins"]);
  });
});

describe("owningWidgetLayerId", () => {
  it("maps an item id back to its widget layer via the segment convention", () => {
    expect(owningWidgetLayerId("fictional-quest:enc-gate:r1")).toBe(
      "widget-enc-gate",
    );
  });
});

describe("sampleRows", () => {
  const pool: FlaggedRow[] = Array.from({ length: 10 }, (_, i) => ({
    id: `r${i}`,
    itemId: `r${i}`,
    title: `t${i}`,
    sourceRefs: [],
    confidence: "normal",
  }));

  it("returns N distinct rows from the pool (deterministic via injected rng)", () => {
    const sample = sampleRows(pool, 3, () => 0);
    expect(sample).toHaveLength(3);
    expect(new Set(sample.map((r) => r.id)).size).toBe(3);
    expect(pool).toContain(sample[0]);
  });

  it("caps the sample at the pool size", () => {
    expect(sampleRows(pool.slice(0, 2), 5)).toHaveLength(2);
  });
});
