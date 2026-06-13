import { passReportFile } from "../schema";

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
  // "sha256:" + the artifact's digest, taken from the QA report's recorded
  // input hash — what an approval hash-locks (§6.8, contract §5).
  contentHash: string;
};

function kindOf(id: string): LayerKind {
  if (id === "spine") return "spine";
  if (id === "ra-mapping") return "ra-mapping";
  return "widget";
}

// Roster order: spine first, ra-mapping last, widgets alphabetical between —
// the order an editor walks the guide (route → tables → achievement links).
function rosterRank(kind: LayerKind): number {
  return kind === "spine" ? 0 : kind === "widget" ? 1 : 2;
}

// The app cannot list layers/ over HTTP, and approvals.json (the eventual
// roster) is not written until a layer is approved (§23.4) — yet review must
// happen first. The QA pass already records every layer artifact it read in
// qa.report.json's `inputs`, so that list is the roster (Pierre's call). A
// guide with no qa.report.json has not been compiled through QA and has
// nothing to review yet → an empty roster, not an error.
export async function loadLayerRoster(slug: string): Promise<LayerReport[]> {
  const response = await fetch(`guides/${slug}/layers/qa.report.json`);
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(
      `Could not load QA report for "${slug}" (HTTP ${response.status})`,
    );
  }
  const qa = passReportFile.parse(await response.json());

  // The QA report records each artifact's exact-bytes digest; an approval
  // hash-locks that (checkStableIdsCore compares "sha256:" + this digest).
  const digestByFile = new Map(qa.inputs.map((i) => [i.file, i.sha256]));

  const layerIds = qa.inputs
    .map((input) => input.file)
    .filter((file) => /^layers\/.+\.json$/.test(file))
    .filter((file) => !file.endsWith(".report.json"))
    .map((file) => file.slice("layers/".length, -".json".length));

  const reports = await Promise.all(
    layerIds.map(async (id): Promise<LayerReport> => {
      const reportResponse = await fetch(
        `guides/${slug}/layers/${id}.report.json`,
      );
      if (!reportResponse.ok) {
        throw new Error(
          `Could not load report for layer "${id}" (HTTP ${reportResponse.status})`,
        );
      }
      const parsed = passReportFile.parse(await reportResponse.json());
      return {
        id,
        kind: kindOf(id),
        rowCount: parsed.report.rowCount,
        anomalies: parsed.report.anomalies,
        flaggedItemIds: parsed.report.flaggedItemIds,
        contentHash: `sha256:${digestByFile.get(`layers/${id}.json`) ?? ""}`,
      };
    }),
  );

  return reports.sort((a, b) => {
    const byKind = rosterRank(a.kind) - rosterRank(b.kind);
    return byKind !== 0 ? byKind : a.id.localeCompare(b.id);
  });
}
