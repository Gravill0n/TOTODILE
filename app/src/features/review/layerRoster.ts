import { fetchOptionalJson } from "@/lib/content/fetchJson";
import type { ManifestWidgetMeta } from "@/schema";
import { passReportFile } from "@/schema";
import { loadLayersManifest } from "./reviewLoaders";

// The content-bearing layers a guide exposes to the review lens, each with the
// flag worklist its pass recorded (FR-E2). source-gathering and qa are process
// passes with no rows to verify, so they never enter the roster.
export type LayerKind = "spine" | "widget" | "ra-mapping";

export type LayerReport = {
  // Matches the artifact basename and the approvals layerRecord.id: "spine",
  // "widget-<seg>", "ra-mapping".
  id: string;
  kind: LayerKind;
  rowCount: number;
  anomalies: string[];
  flaggedItemIds: string[];
  // "sha256:" + the artifact's digest, taken from the manifest entry — what an
  // approval hash-locks (§6.8, contract §5).
  contentHash: string;
  // Denormalized deck-slot metadata carried by widget manifest entries — the
  // grouping key for merged slot cards. Absent on spine/ra-mapping.
  widget?: ManifestWidgetMeta;
};

// Roster order: spine first, ra-mapping last, widgets alphabetical between —
// the order an editor walks the guide (route → tables → achievement links).
function rosterRank(kind: LayerKind): number {
  return kind === "spine" ? 0 : kind === "widget" ? 1 : 2;
}

// The app cannot list layers/ over HTTP, so every reviewable pass upserts its
// entry into layers/manifest.json (contract §2 rule 9) and that file is the
// roster — available right after the spine pass, not only after QA, which is
// what makes per-stage review possible. A guide with no manifest has not
// compiled any reviewable layer yet → an empty roster, not an error.
export async function loadLayerRoster(slug: string): Promise<LayerReport[]> {
  const manifest = await loadLayersManifest(slug);
  if (manifest === null) return [];

  const reports = await Promise.all(
    manifest.entries.map(async (entry): Promise<LayerReport> => {
      // Tolerant of an absent report, because a recompile writes the manifest
      // entry and the report as two separate files: for the moment between
      // them, one 404 would take down the whole lens — the screen the editor
      // is *in* to work through that recompile. The layer stays on the roster
      // (dropping it would make an unapproved layer invisible while still
      // blocking playability, §10.2) and says what is wrong with it.
      const parsed = await fetchOptionalJson(
        `guides/${slug}/${entry.report}`,
        passReportFile,
        `report for layer "${entry.id}"`,
      );
      return {
        id: entry.id,
        kind: entry.kind,
        rowCount: parsed?.report.rowCount ?? 0,
        anomalies: parsed
          ? parsed.report.anomalies
          : [`Pass report ${entry.report} is missing — re-run the pass`],
        flaggedItemIds: parsed?.report.flaggedItemIds ?? [],
        contentHash: `sha256:${entry.sha256}`,
        ...(entry.widget ? { widget: entry.widget } : {}),
      };
    }),
  );

  return reports.sort((a, b) => {
    const byKind = rosterRank(a.kind) - rosterRank(b.kind);
    return byKind !== 0 ? byKind : a.id.localeCompare(b.id);
  });
}
