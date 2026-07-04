import type { ManifestWidgetMeta } from "../schema";
import { layersManifest, passReportFile } from "../schema";

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
  const response = await fetch(`guides/${slug}/layers/manifest.json`);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(
      `Could not load layers manifest for "${slug}" (HTTP ${response.status})`,
    );
  }
  const manifest = layersManifest.parse(await response.json());

  const reports = await Promise.all(
    manifest.entries.map(async (entry): Promise<LayerReport> => {
      const reportResponse = await fetch(`guides/${slug}/${entry.report}`);
      if (!reportResponse.ok) {
        throw new Error(
          `Could not load report for layer "${entry.id}" (HTTP ${reportResponse.status})`,
        );
      }
      const parsed = passReportFile.parse(await reportResponse.json());
      return {
        id: entry.id,
        kind: entry.kind,
        rowCount: parsed.report.rowCount,
        anomalies: parsed.report.anomalies,
        flaggedItemIds: parsed.report.flaggedItemIds,
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
