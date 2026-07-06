import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type {
  ApprovalsFile,
  GenreDeck,
  GuideFile,
  LibraryEntry,
  RaMapping,
  SourceManifest,
} from "../schema";
import { buildApprovalsFile, downloadApprovals } from "./buildApprovals";
import { buildContentIndex, resolveFlaggedRows } from "./flaggedRows";
import { LayerReviewCard } from "./LayerReviewCard";
import type { LayerReport } from "./layerRoster";
import { SlotGroupCard } from "./SlotGroupCard";
import { buildSlotGroups, type SlotGroup } from "./slotGroups";
import { layerUnflaggedRows } from "./spotCheck";
import { useLayerVerdicts } from "./useLayerVerdicts";
import { useSpotChecks } from "./useSpotChecks";
import type { VerdictState } from "./VerdictControls";

type ReviewScreenProps = {
  entry: LibraryEntry;
  roster: LayerReport[];
  guide: GuideFile | null;
  deck: GenreDeck | null;
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
  deck,
  raMapping,
  sources,
  approvals,
}: ReviewScreenProps) {
  const contentIndex = useMemo(
    () => (guide ? buildContentIndex(guide) : new Map()),
    [guide],
  );
  // Widgets collapse to one card per deck slot; spine and ra-mapping keep
  // their per-layer cards.
  const slotGroups = useMemo(
    () =>
      buildSlotGroups(
        roster.filter((layer) => layer.kind === "widget"),
        deck,
      ),
    [roster, deck],
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

  // Effective status: this session's draft decision over the committed one.
  const statusOf = (layerId: string) =>
    verdicts.byLayer.get(layerId)?.status ??
    approvalByLayer.get(layerId)?.status ??
    "draft";

  const approvedCount = roster.filter(
    (layer) => statusOf(layer.id) === "approved",
  ).length;
  const approvedGroups = slotGroups.filter((group) =>
    group.layers.every((layer) => statusOf(layer.id) === "approved"),
  ).length;

  // The card shows a single verdict only when every member agrees on the
  // same draft decision (always true after a group verdict; may be mixed on
  // a backfilled guide until one is recorded).
  const groupVerdictOf = (group: SlotGroup): VerdictState | undefined => {
    const first = verdicts.byLayer.get(group.layers[0]?.id ?? "");
    if (!first) return undefined;
    const agrees = group.layers.every((layer) => {
      const v = verdicts.byLayer.get(layer.id);
      return v?.status === first.status && v?.note === first.note;
    });
    return agrees ? { status: first.status, note: first.note } : undefined;
  };

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
          {slotGroups.length > 0
            ? ` · ${approvedGroups}/${slotGroups.length} slot(s).`
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
            {roster
              .filter((layer) => layer.kind !== "widget")
              .map((layer) =>
                layer.kind === "spine" ? (
                  <LayerReviewCard
                    key={layer.id}
                    layer={layer}
                    flaggedRows={resolveFlaggedRows(
                      layer,
                      contentIndex,
                      raMapping,
                    )}
                    unflaggedRows={
                      guide
                        ? layerUnflaggedRows(
                            layer,
                            contentIndex,
                            guide,
                            raMapping,
                          )
                        : []
                    }
                    sourceById={sourceById}
                    spotCheckVerdicts={
                      spotChecks.byLayer.get(layer.id) ?? new Map()
                    }
                    onSpotCheck={(verdict) =>
                      spotChecks.record(layer.id, verdict)
                    }
                    verdict={verdicts.byLayer.get(layer.id)}
                    approval={approvalByLayer.get(layer.id)}
                    onApprove={() => verdicts.record(layer.id, "approved")}
                    onReject={(note) =>
                      verdicts.record(layer.id, "rejected", note)
                    }
                    onClearVerdict={() => verdicts.clear(layer.id)}
                  />
                ) : null,
              )}

            {slotGroups.map((group) => (
              <SlotGroupCard
                key={group.key}
                group={group}
                guide={guide}
                flaggedRowsOf={(layer) =>
                  resolveFlaggedRows(layer, contentIndex, raMapping)
                }
                sourceById={sourceById}
                statusOf={statusOf}
                groupVerdict={groupVerdictOf(group)}
                onApprove={() => {
                  for (const layer of group.layers) {
                    verdicts.record(layer.id, "approved");
                  }
                }}
                onReject={(note) => {
                  for (const layer of group.layers) {
                    verdicts.record(layer.id, "rejected", note);
                  }
                }}
                onClearVerdict={() => {
                  for (const layer of group.layers) {
                    verdicts.clear(layer.id);
                  }
                }}
              />
            ))}

            {roster
              .filter((layer) => layer.kind === "ra-mapping")
              .map((layer) => (
                <LayerReviewCard
                  key={layer.id}
                  layer={layer}
                  flaggedRows={resolveFlaggedRows(
                    layer,
                    contentIndex,
                    raMapping,
                  )}
                  unflaggedRows={
                    guide
                      ? layerUnflaggedRows(
                          layer,
                          contentIndex,
                          guide,
                          raMapping,
                        )
                      : []
                  }
                  sourceById={sourceById}
                  spotCheckVerdicts={
                    spotChecks.byLayer.get(layer.id) ?? new Map()
                  }
                  onSpotCheck={(verdict) =>
                    spotChecks.record(layer.id, verdict)
                  }
                  verdict={verdicts.byLayer.get(layer.id)}
                  approval={approvalByLayer.get(layer.id)}
                  onApprove={() => verdicts.record(layer.id, "approved")}
                  onReject={(note) =>
                    verdicts.record(layer.id, "rejected", note)
                  }
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
