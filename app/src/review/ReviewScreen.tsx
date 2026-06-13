import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type {
  ApprovalsFile,
  GuideFile,
  LibraryEntry,
  RaMapping,
  SourceManifest,
} from "../schema";
import { buildApprovalsFile, downloadApprovals } from "./buildApprovals";
import { buildContentIndex, resolveFlaggedRows } from "./flaggedRows";
import { LayerReviewCard } from "./LayerReviewCard";
import type { LayerReport } from "./layerRoster";
import { layerUnflaggedRows } from "./spotCheck";
import { useLayerVerdicts } from "./useLayerVerdicts";
import { useSpotChecks } from "./useSpotChecks";

type ReviewScreenProps = {
  entry: LibraryEntry;
  roster: LayerReport[];
  guide: GuideFile | null;
  raMapping: RaMapping | null;
  sources: SourceManifest | null;
  // The committed verdicts from approvals.json, if the guide already has one.
  approvals: ApprovalsFile | null;
};

// S5 — the review lens (desktop-first), editor mode only. Each compiled layer
// shows its flag count and flagged rows beside their sources (FR-E2), a
// spot-check panel (FR-E3), and approve/reject (FR-E4). "Export approvals.json"
// assembles the draft state into the file the editor commits (§23.4).
export function ReviewScreen({
  entry,
  roster,
  guide,
  raMapping,
  sources,
  approvals,
}: ReviewScreenProps) {
  const contentIndex = useMemo(
    () => (guide ? buildContentIndex(guide) : new Map()),
    [guide],
  );
  const sourceById = useMemo(
    () => new Map((sources?.sources ?? []).map((s) => [s.id, s])),
    [sources],
  );
  const approvalByLayer = useMemo(
    () => new Map((approvals?.layers ?? []).map((l) => [l.id, l])),
    [approvals],
  );
  const spotChecks = useSpotChecks(entry.id);
  const verdicts = useLayerVerdicts(entry.id);
  const [exportError, setExportError] = useState<string | null>(null);

  const approvedCount = roster.filter(
    (layer) =>
      (verdicts.byLayer.get(layer.id)?.status ??
        approvalByLayer.get(layer.id)?.status) === "approved",
  ).length;

  const exportApprovals = () => {
    try {
      downloadApprovals(
        buildApprovalsFile(
          entry.id,
          roster,
          verdicts.byLayer,
          spotChecks.byLayer,
        ),
      );
      setExportError(null);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Could not build approvals.json",
      );
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <p className="text-xs uppercase text-missable">
          Review lens — unfinished
        </p>
        <h1 className="text-2xl font-bold">{entry.title}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A guide becomes playable only once every layer is approved (FR-E5).
          {roster.length > 0
            ? ` ${approvedCount}/${roster.length} layer(s) approved.`
            : ""}
        </p>
      </header>

      {roster.length === 0 ? (
        <p className="text-ink-soft">
          Not compiled through QA yet — run the compiler passes, then the
          flagged rows show up here.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {roster.map((layer) => (
              <LayerReviewCard
                key={layer.id}
                layer={layer}
                flaggedRows={resolveFlaggedRows(layer, contentIndex, raMapping)}
                unflaggedRows={
                  guide
                    ? layerUnflaggedRows(layer, contentIndex, guide, raMapping)
                    : []
                }
                sourceById={sourceById}
                spotCheckVerdicts={
                  spotChecks.byLayer.get(layer.id) ?? new Map()
                }
                onSpotCheck={(verdict) => spotChecks.record(layer.id, verdict)}
                verdict={verdicts.byLayer.get(layer.id)}
                approval={approvalByLayer.get(layer.id)}
                onApprove={() => verdicts.record(layer.id, "approved")}
                onReject={(note) => verdicts.record(layer.id, "rejected", note)}
                onClearVerdict={() => verdicts.clear(layer.id)}
              />
            ))}
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <button
              type="button"
              onClick={exportApprovals}
              className="rounded border border-line bg-card px-3 py-1 text-sm"
            >
              Export approvals.json
            </button>
            <p className="mt-2 text-sm text-ink-soft">
              Builds the complete file from your decisions — drop it into{" "}
              <code>guides/{entry.id}/</code> and commit it (§23.4).
            </p>
            {exportError ? (
              <p role="alert" className="mt-2 text-sm text-missable">
                {exportError}
              </p>
            ) : null}
          </div>
        </>
      )}

      <p className="mt-8 text-sm">
        <Link to="/" className="underline">
          Back to the library
        </Link>
      </p>
    </main>
  );
}
