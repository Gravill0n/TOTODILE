// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLayerRoster } from "@/features/review/layerRoster";
import { SCHEMA_VERSION } from "@/schema";

afterEach(() => vi.unstubAllGlobals());

const HEX64 = "a".repeat(64);
const HEX64_B = "b".repeat(64);

function manifest() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "pokemon-crystal",
    entries: [
      // Deliberately not in roster order — the loader owns the sort.
      {
        id: "ra-mapping",
        kind: "ra-mapping",
        artifact: "layers/ra-mapping.json",
        report: "layers/ra-mapping.report.json",
        sha256: HEX64,
      },
      {
        id: "widget-badges",
        kind: "widget",
        artifact: "layers/widget-badges.json",
        report: "layers/widget-badges.report.json",
        sha256: HEX64_B,
        widget: {
          deckPosition: 0,
          scope: { kind: "global" },
          title: "Gym Badges",
        },
      },
      {
        id: "spine",
        kind: "spine",
        artifact: "layers/spine.json",
        report: "layers/spine.report.json",
        sha256: HEX64,
      },
    ],
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

function stubReports(manifestBody: unknown = manifest()) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("layers/manifest.json"))
        return Response.json(manifestBody);
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
  it("derives the roster from layers/manifest.json, spine first and ra-mapping last", async () => {
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

  it("hash-locks each layer from its manifest digest", async () => {
    stubReports();
    const roster = await loadLayerRoster("pokemon-crystal");
    expect(roster.find((l) => l.id === "spine")?.contentHash).toBe(
      `sha256:${HEX64}`,
    );
    expect(roster.find((l) => l.id === "widget-badges")?.contentHash).toBe(
      `sha256:${HEX64_B}`,
    );
  });

  it("passes widget metadata through for slot grouping", async () => {
    stubReports();
    const roster = await loadLayerRoster("pokemon-crystal");
    expect(roster.find((l) => l.id === "widget-badges")?.widget).toEqual({
      deckPosition: 0,
      scope: { kind: "global" },
      title: "Gym Badges",
    });
    expect(roster.find((l) => l.id === "spine")?.widget).toBeUndefined();
  });

  it("returns an empty roster when the guide has no manifest yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    expect(await loadLayerRoster("ghost-quest")).toEqual([]);
  });

  it("throws on a malformed manifest (a real fault, not an empty state)", async () => {
    stubReports({
      schemaVersion: SCHEMA_VERSION,
      guideId: "pokemon-crystal",
      entries: [{ id: "data" }],
    });
    await expect(loadLayerRoster("pokemon-crystal")).rejects.toThrow();
  });

  // Was: a missing report threw. A recompile writes the manifest entry and
  // the report as two files, and in the gap between them that throw took down
  // the whole lens — the screen the editor is in to work through the
  // recompile (2026-07-31). The layer stays listed and says what is wrong.
  it("keeps a layer whose report is missing, flagged as such", async () => {
    const partial = manifest();
    partial.entries = partial.entries.filter((e) => e.id === "spine");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("layers/manifest.json")) return Response.json(partial);
        return new Response("not found", { status: 404 });
      }),
    );
    const roster = await loadLayerRoster("pokemon-crystal");
    expect(roster).toHaveLength(1);
    expect(roster[0]?.rowCount).toBe(0);
    expect(roster[0]?.anomalies).toEqual([
      "Pass report layers/spine.report.json is missing — re-run the pass",
    ]);
  });

  // A malformed report is still a fault: it means the pass wrote nonsense,
  // which absence does not (§11.1).
  it("still throws on a present-but-malformed report", async () => {
    const partial = manifest();
    partial.entries = partial.entries.filter((e) => e.id === "spine");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("layers/manifest.json")) return Response.json(partial);
        return Response.json({ nope: true });
      }),
    );
    await expect(loadLayerRoster("pokemon-crystal")).rejects.toThrow();
  });
});
