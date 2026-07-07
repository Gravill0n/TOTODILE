import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  GuideFile,
  LayerRecord,
  SourceEntry,
  SpotCheckVerdict,
} from "@/schema";
import { FlaggedRowView } from "./FlaggedRowView";
import type { FlaggedRow } from "./flaggedRows";
import type { LayerReport } from "./layerRoster";
import { SpotCheckPanel } from "./SpotCheckPanel";
import { type SlotGroup, scopeLabel } from "./slotGroups";
import type { VerdictState } from "./VerdictControls";
import { VerdictControls } from "./VerdictControls";

type SlotGroupCardProps = {
  group: SlotGroup;
  // Resolves member scope labels; null mid-pipeline before any spine exists.
  guide: GuideFile | null;
  flaggedRowsOf: (layer: LayerReport) => FlaggedRow[];
  sourceById: Map<string, SourceEntry>;
  // Effective status per member: draft verdict over committed approval.
  statusOf: (layerId: string) => LayerRecord["status"];
  // Spot-check pool: the union of the members' confident rows (T5b). Verdicts
  // are merged across members for display; each records on its owning layer.
  unflaggedRows: FlaggedRow[];
  spotCheckVerdicts: Map<string, SpotCheckVerdict>;
  onSpotCheck: (verdict: SpotCheckVerdict) => void;
  // The shared draft verdict when every member agrees, else undefined.
  groupVerdict: VerdictState | undefined;
  // One decision for the whole slot — fans out to every member layer.
  onApprove: () => void;
  onReject: (note: string) => void;
  onClearVerdict: () => void;
};

// One review card per deck slot (FR-E4 at slot granularity): Crystal's 78
// encounter tables are one judgment, not 78. Members stay independent
// layerRecords in approvals.json — the card is a UI grouping only. Flagged
// members surface individually so the editor sees exactly what the group
// verdict covers; flag-free members collapse to a count.
export function SlotGroupCard({
  group,
  guide,
  flaggedRowsOf,
  sourceById,
  statusOf,
  unflaggedRows,
  spotCheckVerdicts,
  onSpotCheck,
  groupVerdict,
  onApprove,
  onReject,
  onClearVerdict,
}: SlotGroupCardProps) {
  const [open, setOpen] = useState(false);

  const statuses = group.layers.map((layer) => statusOf(layer.id));
  const fold = statuses.every((s) => s === "approved")
    ? "approved"
    : statuses.some((s) => s === "rejected")
      ? "rejected"
      : statuses.every((s) => s === "draft")
        ? "draft"
        : "mixed";
  const approved = fold === "approved";
  const STATUS_LABEL = {
    approved: "Approved",
    rejected: "Rejected",
    draft: "Unreviewed",
    // Possible on backfilled guides; a group verdict overwrites all members.
    mixed: "Mixed",
  } as const;

  const flagCount = group.layers.reduce(
    (sum, layer) => sum + layer.flaggedItemIds.length,
    0,
  );
  const rowCount = group.layers.reduce((sum, layer) => sum + layer.rowCount, 0);
  const flaggedMembers = group.layers.filter(
    (layer) => layer.flaggedItemIds.length > 0 || layer.anomalies.length > 0,
  );
  const cleanCount = group.layers.length - flaggedMembers.length;

  return (
    <Card
      className={cn(
        "gap-2 p-4",
        approved ? "border-line bg-card" : "border-missable bg-paper-dim",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-baseline justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="font-bold">
          {group.title}
          {group.deckPosition !== null ? (
            <span className="ml-2 text-xs font-normal text-ink-soft">
              slot {group.deckPosition}
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-2 text-xs">
          <span className="text-ink-soft">{group.layers.length} members</span>
          <Badge
            variant="outline"
            className={cn(
              "font-bold",
              flagCount > 0 ? "text-missable" : "text-ink-soft",
            )}
          >
            {flagCount} flagged
          </Badge>
          <span className="text-ink-soft">{rowCount} rows</span>
          <Badge
            variant={approved ? "default" : "outline"}
            className={cn("uppercase", !approved && "text-missable")}
          >
            {STATUS_LABEL[fold]}
          </Badge>
        </span>
      </button>

      {open ? (
        <>
          {flaggedMembers.map((layer) => (
            <section key={layer.id} className="mt-3">
              <h3 className="text-sm font-bold">
                {layer.id}
                {layer.widget ? (
                  <span className="ml-2 font-normal text-ink-soft">
                    {scopeLabel(layer.widget.scope, guide)}
                  </span>
                ) : null}
              </h3>
              {layer.anomalies.length > 0 ? (
                <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                  {layer.anomalies.map((anomaly) => (
                    <li key={anomaly}>{anomaly}</li>
                  ))}
                </ul>
              ) : null}
              {layer.flaggedItemIds.length > 0 ? (
                <ul className="mt-2 space-y-3">
                  {flaggedRowsOf(layer).map((row) => (
                    <FlaggedRowView
                      key={row.id}
                      row={row}
                      sourceById={sourceById}
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {cleanCount > 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              {cleanCount} member layer(s) with no flags.
            </p>
          ) : null}

          <SpotCheckPanel
            unflaggedRows={unflaggedRows}
            sourceById={sourceById}
            verdicts={spotCheckVerdicts}
            onRecord={onSpotCheck}
            caption={
              group.layers.length > 1
                ? `sampled across ${group.layers.length} member layers`
                : undefined
            }
          />

          <VerdictControls
            verdict={groupVerdict}
            subject={`${group.title} slot`}
            notePlaceholder="rejection note (required — name the failing members; each member's record carries it)"
            onApprove={onApprove}
            onReject={onReject}
            onClear={onClearVerdict}
          />
        </>
      ) : null}
    </Card>
  );
}
