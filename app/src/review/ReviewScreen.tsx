import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type {
  ApprovalsFile,
  GuideFile,
  LibraryEntry,
  RaMapping,
  SourceManifest,
} from "../schema";
import { buildContentIndex, resolveFlaggedRows } from "./flaggedRows";
import { LayerReviewCard } from "./LayerReviewCard";
import type { LayerReport } from "./layerRoster";
import { layerUnflaggedRows } from "./spotCheck";
import { useSpotChecks } from "./useSpotChecks";

type ReviewScreenProps = {
  entry: LibraryEntry;
  roster: LayerReport[];
  guide: GuideFile | null;
  raMapping: RaMapping | null;
  sources: SourceManifest | null;
  // Verdict overlay; absent until the approval flow writes it (Task 4).
  approvals: ApprovalsFile | null;
};

// S5 — the review lens (desktop-first), editor mode only. Each compiled layer
// shows its flag count; expanding a layer reveals the flagged rows beside the
// sources they trace to (FR-E2/E3). Approve/reject lands in Task 4.
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

  const totalFlags = roster.reduce(
    (sum, layer) => sum + layer.flaggedItemIds.length,
    0,
  );

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
            ? ` ${totalFlags} flagged row(s) to verify across ${roster.length} layer(s).`
            : ""}
        </p>
      </header>

      {roster.length === 0 ? (
        <p className="text-ink-soft">
          Not compiled through QA yet — run the compiler passes, then the
          flagged rows show up here.
        </p>
      ) : (
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
              verdicts={spotChecks.byLayer.get(layer.id) ?? new Map()}
              onRecord={(verdict) => spotChecks.record(layer.id, verdict)}
              approval={approvalByLayer.get(layer.id)}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        Random spot-checks and approve/reject arrive in the next review-lens
        tasks.
      </p>
      <p className="mt-8 text-sm">
        <Link to="/" className="underline">
          Back to the library
        </Link>
      </p>
    </main>
  );
}
