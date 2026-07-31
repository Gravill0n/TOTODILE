// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPlayable,
  loadApprovals,
  loadPlayability,
} from "@/features/review/approvalsData";
import type { LayersManifest } from "@/schema";
import { approvalsFile, layersManifest, SCHEMA_VERSION } from "@/schema";
import { validLayer } from "@/testing/helpers";

afterEach(() => vi.unstubAllGlobals());

const HEX64 = "a".repeat(64);

function approvals(...statuses: ("draft" | "approved" | "rejected")[]) {
  return approvalsFile.parse({
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    layers: statuses.map((status, index) => ({
      ...validLayer(status),
      id: `layer-${index}`,
    })),
  });
}

function manifestOf(...ids: string[]): LayersManifest {
  return layersManifest.parse({
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    entries: ids.map((id) => ({
      id,
      kind: id === "spine" ? "spine" : "widget",
      artifact: `layers/${id}.json`,
      report: `layers/${id}.report.json`,
      sha256: HEX64,
      ...(id === "spine"
        ? {}
        : {
            widget: {
              deckPosition: 0,
              scope: { kind: "global" },
              title: "Widget",
            },
          }),
    })),
  });
}

// Approvals whose layer ids match manifest entries.
function approvalsFor(
  ids: string[],
  status: "draft" | "approved" | "rejected" = "approved",
) {
  return approvalsFile.parse({
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    layers: ids.map((id) => ({ ...validLayer(status), id })),
  });
}

describe("isPlayable (FR-E5 + pipeline completion)", () => {
  it("no approvals record → not playable", () => {
    expect(isPlayable(null, null, true)).toBe(false);
  });

  it("empty layer set → not playable", () => {
    expect(isPlayable(approvals(), null, true)).toBe(false);
  });

  it("any unapproved layer → not playable", () => {
    expect(isPlayable(approvals("approved", "draft"), null, true)).toBe(false);
    expect(isPlayable(approvals("approved", "rejected"), null, true)).toBe(
      false,
    );
  });

  it("a partial all-approved approvals (spine-only stage export) is NOT playable before QA", () => {
    // The per-stage regression: mid-pipeline the editor exports an
    // approvals.json holding only the completed stage, all approved — the
    // guide must stay in review until the pipeline completes.
    expect(isPlayable(approvalsFor(["spine"]), null, false)).toBe(false);
    expect(
      isPlayable(approvalsFor(["spine"]), manifestOf("spine"), false),
    ).toBe(false);
  });

  it("a manifest entry with no approved record → not playable", () => {
    // A widget compiled after the last export has an entry but no record.
    expect(
      isPlayable(
        approvalsFor(["spine"]),
        manifestOf("spine", "widget-w1"),
        true,
      ),
    ).toBe(false);
  });

  it("QA complete + every layer approved + manifest covered → playable", () => {
    expect(
      isPlayable(
        approvalsFor(["spine", "widget-w1"]),
        manifestOf("spine", "widget-w1"),
        true,
      ),
    ).toBe(true);
  });

  it("tolerates approvals records absent from the manifest (Crystal's data orphan)", () => {
    expect(
      isPlayable(
        approvalsFor(["spine", "widget-w1", "data"]),
        manifestOf("spine", "widget-w1"),
        true,
      ),
    ).toBe(true);
  });

  it("no manifest (legacy guide) → the old all-approved rule, gated on QA", () => {
    expect(isPlayable(approvals("approved", "approved"), null, true)).toBe(
      true,
    );
    expect(isPlayable(approvals("approved", "approved"), null, false)).toBe(
      false,
    );
  });
});

describe("loadPlayability", () => {
  function stubGuideFetch({
    withQaReport,
    manifestIds,
    approvedIds,
    withGuideFile = true,
    offline = false,
  }: {
    withQaReport: boolean;
    manifestIds: string[];
    approvedIds: string[];
    withGuideFile?: boolean;
    offline?: boolean;
  }) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("guide.json")) {
          // A fetch that rejects is the offline signal, not a missing file.
          if (offline) throw new TypeError("Failed to fetch");
          return withGuideFile
            ? new Response(null, { status: 200 })
            : new Response("not found", { status: 404 });
        }
        if (url.endsWith("layers/qa.report.json")) {
          return withQaReport
            ? new Response("{}", { status: 200 })
            : new Response("not found", { status: 404 });
        }
        if (url.endsWith("layers/manifest.json")) {
          return manifestIds.length > 0
            ? Response.json(manifestOf(...manifestIds))
            : new Response("not found", { status: 404 });
        }
        if (url.endsWith("approvals.json")) {
          return approvedIds.length > 0
            ? Response.json(approvalsFor(approvedIds))
            : new Response("not found", { status: 404 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
  }

  it("true for a complete, fully approved pipeline", async () => {
    stubGuideFetch({
      withQaReport: true,
      manifestIds: ["spine", "widget-w1"],
      approvedIds: ["spine", "widget-w1"],
    });
    expect(await loadPlayability("fictional-quest")).toBe(true);
  });

  it("false while QA has not run (spine-only stage, all approved)", async () => {
    stubGuideFetch({
      withQaReport: false,
      manifestIds: ["spine"],
      approvedIds: ["spine"],
    });
    expect(await loadPlayability("fictional-quest")).toBe(false);
  });

  it("false when the manifest lists an unapproved layer", async () => {
    stubGuideFetch({
      withQaReport: true,
      manifestIds: ["spine", "widget-w1"],
      approvedIds: ["spine"],
    });
    expect(await loadPlayability("fictional-quest")).toBe(false);
  });

  // A recompile rewrites guide.json: between the QA pass deleting it and the
  // assembly writing it back, every review input still says "approved", and
  // the play route would open a guide whose content is not there.
  it("false when guide.json is absent, however green the review inputs are", async () => {
    stubGuideFetch({
      withQaReport: true,
      manifestIds: ["spine", "widget-w1"],
      approvedIds: ["spine", "widget-w1"],
      withGuideFile: false,
    });
    expect(await loadPlayability("fictional-quest")).toBe(false);
  });

  // Offline, the probe cannot answer: HEAD is not served from the workbox
  // precache (`caches.match` is GET-only). Fail open — offline is exactly when
  // the precached guide.json is guaranteed to be there, and marking every
  // guide unfinished on a plane would be the worse wrong answer.
  it("true when the probe fails outright (offline), not false", async () => {
    stubGuideFetch({
      withQaReport: true,
      manifestIds: ["spine", "widget-w1"],
      approvedIds: ["spine", "widget-w1"],
      offline: true,
    });
    expect(await loadPlayability("fictional-quest")).toBe(true);
  });
});

describe("loadApprovals", () => {
  it("returns null when the file is absent (404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    expect(await loadApprovals("ghost-quest")).toBeNull();
  });

  it("parses a present approvals file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(approvals("approved"))),
    );
    const result = await loadApprovals("fictional-quest");
    expect(result?.layers).toHaveLength(1);
  });

  it("throws on a present-but-malformed file (§11.1)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ schemaVersion: 0, guides: "nope" })),
    );
    await expect(loadApprovals("fictional-quest")).rejects.toThrow();
  });
});
