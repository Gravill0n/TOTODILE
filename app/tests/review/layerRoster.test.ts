// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLayerRoster } from "../../src/review/layerRoster";
import { SCHEMA_VERSION } from "../../src/schema";

afterEach(() => vi.unstubAllGlobals());

const HEX64 = "a".repeat(64);

function qaReport() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "pokemon-crystal",
    pass: "qa",
    layer: "qa",
    generatedAt: "2026-06-13T00:00:00Z",
    inputs: [
      { file: "layers/spine.json", sha256: HEX64 },
      { file: "layers/widget-badges.json", sha256: HEX64 },
      { file: "layers/ra-mapping.json", sha256: HEX64 },
      // Assembled outputs and reports must be filtered out of the roster.
      { file: "guide.json", sha256: HEX64 },
      { file: "sources.json", sha256: HEX64 },
    ],
    report: { rowCount: 1, anomalies: [], flaggedItemIds: [] },
    notes: [],
  };
}

function report(layer: string, pass: string, flagged: string[]) {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "pokemon-crystal",
    pass,
    layer,
    generatedAt: "2026-06-13T00:00:00Z",
    inputs: [],
    report: { rowCount: 3, anomalies: [], flaggedItemIds: flagged },
    notes: [],
  };
}

function stubReports() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("layers/qa.report.json"))
        return Response.json(qaReport());
      if (url.endsWith("layers/spine.report.json")) {
        return Response.json(
          report("spine", "spine", ["pokemon-crystal:c1:s2"]),
        );
      }
      if (url.endsWith("layers/widget-badges.report.json")) {
        return Response.json(report("widget-badges", "widget", []));
      }
      if (url.endsWith("layers/ra-mapping.report.json")) {
        return Response.json(report("ra-mapping", "ra-mapping", []));
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

describe("loadLayerRoster", () => {
  it("derives the roster from qa.report.json inputs, spine first and ra-mapping last", async () => {
    stubReports();
    const roster = await loadLayerRoster("pokemon-crystal");
    expect(roster.map((l) => l.id)).toEqual([
      "spine",
      "widget-badges",
      "ra-mapping",
    ]);
    expect(roster.map((l) => l.kind)).toEqual([
      "spine",
      "widget",
      "ra-mapping",
    ]);
    expect(roster[0]?.flaggedItemIds).toEqual(["pokemon-crystal:c1:s2"]);
  });

  it("returns an empty roster when the guide has no QA report", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    expect(await loadLayerRoster("ghost-quest")).toEqual([]);
  });
});
