import type { ApprovalsFile, LayerRecord, SpotCheckVerdict } from "@/schema";
import { approvalsFile, SCHEMA_VERSION } from "@/schema";
import type { LayerReport } from "./layerRoster";
import type { LayerVerdict } from "./reviewStore";

// The roster kind → the approvals layerKind enum (§ schema/approvals.ts).
function layerKindFor(kind: LayerReport["kind"]): LayerRecord["kind"] {
  return kind === "widget" ? "widget-pass" : kind;
}

// Assemble the complete approvals.json from the review draft state (FR-E4): one
// record per compiled layer, carrying its hash-lock, the recorded verdict (if
// the editor decided), and the spot-check verdicts (FR-E3). Parsing through the
// schema enforces every invariant — notably a rejection must carry a note — so
// an invalid composition throws here rather than producing a bad file.
export function buildApprovalsFile(
  guideId: string,
  roster: LayerReport[],
  verdictsByLayer: Map<string, LayerVerdict>,
  spotChecksByLayer: Map<string, Map<string, SpotCheckVerdict>>,
): ApprovalsFile {
  const layers = roster.map((layer) => {
    const verdict = verdictsByLayer.get(layer.id);
    const spotChecks = [...(spotChecksByLayer.get(layer.id)?.values() ?? [])];
    return {
      id: layer.id,
      kind: layerKindFor(layer.kind),
      artifact: `layers/${layer.id}.json`,
      report: {
        rowCount: layer.rowCount,
        anomalies: layer.anomalies,
        flaggedItemIds: layer.flaggedItemIds,
      },
      contentHash: layer.contentHash,
      status: verdict?.status ?? "draft",
      ...(verdict
        ? {
            approval: {
              date: verdict.date,
              verdict: verdict.status,
              ...(verdict.note !== undefined ? { note: verdict.note } : {}),
            },
          }
        : {}),
      spotChecks,
    };
  });

  return approvalsFile.parse({
    schemaVersion: SCHEMA_VERSION,
    guideId,
    layers,
  });
}

// Download the assembled file for the editor to commit into guides/<slug>/ —
// the review-lens flow is the only writer of approvals.json (§23.4). Mirrors
// the progress-export download in shell/SettingsScreen.tsx.
export function downloadApprovals(file: ApprovalsFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "approvals.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
