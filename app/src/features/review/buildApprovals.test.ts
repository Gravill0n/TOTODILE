import { describe, expect, it } from "vitest";
import { buildApprovalsFile } from "@/features/review/buildApprovals";
import type { LayerReport } from "@/features/review/layerRoster";
import type { LayerVerdict } from "@/features/review/reviewStore";
import type { SpotCheckVerdict } from "@/schema";

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

  // Per-stage gating exports mid-pipeline files: the roster may hold only the
  // stages compiled so far. Each member resolves its own (identical, group
  // fan-out) verdict from the map — no group record exists in the file.
  it("exports a partial mid-pipeline roster (spine + widgets, no ra-mapping)", () => {
    const date = "2026-07-06T10:00:00Z";
    const partial = [layer("spine", "spine"), layer("widget-badges", "widget")];
    const verdicts = new Map<string, LayerVerdict>([
      ["spine", { status: "approved", date }],
      ["widget-badges", { status: "approved", date }],
    ]);
    const file = buildApprovalsFile(
      "fictional-quest",
      partial,
      verdicts,
      new Map(),
    );
    expect(file.layers.map((l) => l.id)).toEqual(["spine", "widget-badges"]);
    expect(file.layers.every((l) => l.status === "approved")).toBe(true);
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
