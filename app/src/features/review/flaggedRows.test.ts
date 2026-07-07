import { describe, expect, it } from "vitest";
import {
  buildContentIndex,
  resolveFlaggedRows,
} from "@/features/review/flaggedRows";
import type { LayerReport } from "@/features/review/layerRoster";
import { guideFile, raMapping as raMappingSchema } from "@/schema";
import { validGuide, validRaMapping } from "@/testing/helpers";

const guide = guideFile.parse(validGuide());
const index = buildContentIndex(guide);

function layer(
  kind: LayerReport["kind"],
  flaggedItemIds: string[],
): LayerReport {
  return {
    id: kind,
    kind,
    rowCount: flaggedItemIds.length,
    anomalies: [],
    flaggedItemIds,
    contentHash: `sha256:${"a".repeat(64)}`,
  };
}

describe("buildContentIndex", () => {
  it("indexes steps by id with their text", () => {
    expect(index.get("fictional-quest:c1:s1")?.title).toContain("drawbridge");
  });

  it("labels checklist rows, matrix cells, and dataTable rows", () => {
    expect(index.get("fictional-quest:w1:r1")?.title).toBe("Gate key");
    expect(index.get("fictional-quest:w2:hero-fire")?.title).toBe(
      "Hero × Fire badge",
    );
    expect(index.get("fictional-quest:w3:sentry")?.title).toBe(
      "HP: 10 · XP: 3",
    );
  });
});

describe("resolveFlaggedRows", () => {
  it("maps spine flagged ids to step rows with their sources", () => {
    const rows = resolveFlaggedRows(
      layer("spine", ["fictional-quest:c1:s2"]),
      index,
      null,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceRefs).toEqual(["src-wiki"]);
  });

  it("maps widget flagged ids to their derived labels", () => {
    const rows = resolveFlaggedRows(
      layer("widget", ["fictional-quest:w2:hero-fire"]),
      index,
      null,
    );
    expect(rows[0]?.title).toBe("Hero × Fire badge");
    expect(rows[0]?.confidence).toBe("flagged");
  });

  it("turns ra-mapping flagged targets into RA #<id> rows", () => {
    const mapping = raMappingSchema.parse(validRaMapping());
    const rows = resolveFlaggedRows(
      layer("ra-mapping", ["fictional-quest:c1:s1"]),
      index,
      mapping,
    );
    expect(rows[0]?.title).toMatch(/^RA #101 → /);
  });

  it("marks ra-mapping rows whose target lives in an approved layer (T6)", () => {
    const mapping = raMappingSchema.parse(validRaMapping());
    const rows = resolveFlaggedRows(
      layer("ra-mapping", ["fictional-quest:c1:s1", "fictional-quest:w1:r1"]),
      index,
      mapping,
      (itemId) => itemId === "fictional-quest:c1:s1",
    );
    const spineTarget = rows.find((r) => r.itemId === "fictional-quest:c1:s1");
    const widgetTarget = rows.find((r) => r.itemId === "fictional-quest:w1:r1");
    expect(spineTarget?.targetApproved).toBe(true);
    expect(widgetTarget?.targetApproved).toBeUndefined();
  });

  it("surfaces a flagged id with no matching row rather than dropping it", () => {
    const rows = resolveFlaggedRows(
      layer("spine", ["fictional-quest:c9:s9"]),
      index,
      null,
    );
    expect(rows[0]?.title).toBe("fictional-quest:c9:s9");
    expect(rows[0]?.detail).toMatch(/no matching row/);
  });
});
