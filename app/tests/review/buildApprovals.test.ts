import { describe, expect, it } from "vitest";
import { buildApprovalsFile } from "../../src/review/buildApprovals";
import type { LayerReport } from "../../src/review/layerRoster";
import type { LayerVerdict } from "../../src/review/reviewStore";
import type { SpotCheckVerdict } from "../../src/schema";

function layer(
  id: string,
  kind: LayerReport["kind"],
  flaggedItemIds: string[] = [],
): LayerReport {
  return {
    id,
    kind,
    rowCount: 5,
    anomalies: [],
    flaggedItemIds,
    contentHash: `sha256:${id[0]?.repeat(64)}`,
  };
}

const roster: LayerReport[] = [
  layer("spine", "spine", ["fictional-quest:c1:s2"]),
  layer("widget-badges", "widget"),
  layer("ra-mapping", "ra-mapping"),
];

function spotChecksFor(
  itemId: string,
  verdict: SpotCheckVerdict["verdict"],
): Map<string, Map<string, SpotCheckVerdict>> {
  return new Map([["spine", new Map([[itemId, { itemId, verdict }]])]]);
}

describe("buildApprovalsFile (FR-E4)", () => {
  it("assembles a schema-valid approvals file from the draft state", () => {
    const verdicts = new Map<string, LayerVerdict>([
      ["spine", { status: "approved", date: "2026-06-13T10:00:00Z" }],
      [
        "ra-mapping",
        {
          status: "rejected",
          note: "achievement 5 maps to the wrong step",
          date: "2026-06-13T10:01:00Z",
        },
      ],
    ]);
    const file = buildApprovalsFile(
      "fictional-quest",
      roster,
      verdicts,
      spotChecksFor("fictional-quest:c1:s1", "pass"),
    );

    const spine = file.layers.find((l) => l.id === "spine");
    expect(spine?.kind).toBe("spine");
    expect(spine?.status).toBe("approved");
    expect(spine?.approval?.verdict).toBe("approved");
    expect(spine?.contentHash).toBe(`sha256:${"s".repeat(64)}`);
    expect(spine?.spotChecks).toHaveLength(1);

    const widget = file.layers.find((l) => l.id === "widget-badges");
    expect(widget?.kind).toBe("widget-pass");
    expect(widget?.status).toBe("draft");
    expect(widget?.approval).toBeUndefined();

    expect(file.layers.find((l) => l.id === "ra-mapping")?.approval?.note).toBe(
      "achievement 5 maps to the wrong step",
    );
  });

  it("refuses to build a rejection without a note (FR-E4)", () => {
    const verdicts = new Map<string, LayerVerdict>([
      ["spine", { status: "rejected", date: "2026-06-13T10:00:00Z" }],
    ]);
    expect(() =>
      buildApprovalsFile("fictional-quest", roster, verdicts, new Map()),
    ).toThrow();
  });
});
