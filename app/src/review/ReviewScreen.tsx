import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
import {
  groupUnflaggedRows,
  layerUnflaggedRows,
  owningWidgetLayerId,
} from "./spotCheck";
import {
  firstIncompleteStage,
  STAGE_LABEL,
  type StageState,
  stageStates,
} from "./stages";
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

const STAGE_STATE_LABEL: Record<StageState, string> = {
  empty: "Waiting",
  "in-review": "In review",
  approved: "Approved",
  rejected: "Rejected",
};

// S5 — the review lens (desktop-first), editor mode only, organized into the
// three pipeline stages (spine → widgets → ra-mapping): a stage whose pass has
// not run yet shows a waiting placeholder naming the unlock skill; compiled
// stages are never UI-blocked (backfilled guides show everything at once).
// Each compiled layer shows its flag count and flagged rows beside their
// sources (FR-E2), a spot-check panel (FR-E3), and approve/reject (FR-E4).
// "Export approvals.json" assembles the draft state into the file the editor
// commits (§23.4).
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
  const stages = stageStates(roster, statusOf);
  const incompleteStage = firstIncompleteStage(stages);

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

  const stageHeading = (label: string, state: StageState) => (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
      {label}
      <Badge
        variant={state === "approved" ? "default" : "outline"}
        className={cn("uppercase", state === "rejected" && "text-missable")}
      >
        {STAGE_STATE_LABEL[state]}
      </Badge>
    </h2>
  );

  // Spine and ra-mapping keep one card per layer; widgets render as slot
  // groups in their own section.
  const layerCard = (layer: LayerReport) => (
    <LayerReviewCard
      key={layer.id}
      layer={layer}
      flaggedRows={resolveFlaggedRows(layer, contentIndex, raMapping)}
      unflaggedRows={
        guide ? layerUnflaggedRows(layer, contentIndex, guide, raMapping) : []
      }
      sourceById={sourceById}
      spotCheckVerdicts={spotChecks.byLayer.get(layer.id) ?? new Map()}
      onSpotCheck={(verdict) => spotChecks.record(layer.id, verdict)}
      verdict={verdicts.byLayer.get(layer.id)}
      approval={approvalByLayer.get(layer.id)}
      onApprove={() => verdicts.record(layer.id, "approved")}
      onReject={(note) => verdicts.record(layer.id, "rejected", note)}
      onClearVerdict={() => verdicts.clear(layer.id)}
    />
  );

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
          <div className="space-y-8">
            <section>
              {stageHeading(STAGE_LABEL.spine, stages.spine)}
              {stages.spine === "empty" ? (
                <p className="text-sm text-ink-soft">
                  Not compiled yet — run <code>guide-pass-spine</code> to
                  extract the route spine.
                </p>
              ) : (
                <div className="space-y-4">
                  {roster
                    .filter((layer) => layer.kind === "spine")
                    .map(layerCard)}
                </div>
              )}
            </section>

            <section>
              {stageHeading(STAGE_LABEL.widgets, stages.widgets)}
              {stages.widgets === "empty" ? (
                <p className="text-sm text-ink-soft">
                  Waiting — approve the spine, export approvals.json, commit it,
                  then run <code>guide-pass-widgets</code>.
                </p>
              ) : (
                <div className="space-y-4">
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
                      unflaggedRows={
                        guide
                          ? groupUnflaggedRows(
                              group.layers,
                              contentIndex,
                              guide,
                              raMapping,
                            )
                          : []
                      }
                      spotCheckVerdicts={
                        new Map(
                          group.layers.flatMap((layer) => [
                            ...(spotChecks.byLayer.get(layer.id) ?? new Map()),
                          ]),
                        )
                      }
                      onSpotCheck={(verdict) =>
                        spotChecks.record(
                          owningWidgetLayerId(verdict.itemId),
                          verdict,
                        )
                      }
                      groupVerdict={groupVerdictOf(group)}
                      onApprove={() =>
                        verdicts.recordAll(
                          group.layers.map((layer) => layer.id),
                          "approved",
                        )
                      }
                      onReject={(note) =>
                        verdicts.recordAll(
                          group.layers.map((layer) => layer.id),
                          "rejected",
                          note,
                        )
                      }
                      onClearVerdict={() =>
                        verdicts.clearAll(group.layers.map((layer) => layer.id))
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              {stageHeading(STAGE_LABEL["ra-mapping"], stages["ra-mapping"])}
              {stages["ra-mapping"] === "empty" ? (
                <p className="text-sm text-ink-soft">
                  Waiting — approve every widget slot, export approvals.json,
                  commit it, then run <code>guide-pass-ra-mapping</code>.
                </p>
              ) : (
                <div className="space-y-4">
                  {roster
                    .filter((layer) => layer.kind === "ra-mapping")
                    .map(layerCard)}
                </div>
              )}
            </section>
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
              <code>guides/{entry.id}/</code> and commit it (§23.4).{" "}
              {incompleteStage
                ? `The ${STAGE_LABEL[incompleteStage]} stage is not fully approved yet.`
                : "Every compiled stage is approved — committing this export unlocks the next pass."}
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
