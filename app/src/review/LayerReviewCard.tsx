import { Check, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayerRecord, SourceEntry, SpotCheckVerdict } from "../schema";
import { FlaggedRowView } from "./FlaggedRowView";
import type { FlaggedRow } from "./flaggedRows";
import type { LayerReport } from "./layerRoster";
import type { LayerVerdict } from "./reviewStore";
import { SpotCheckPanel } from "./SpotCheckPanel";

type LayerReviewCardProps = {
  layer: LayerReport;
  flaggedRows: FlaggedRow[];
  unflaggedRows: FlaggedRow[];
  sourceById: Map<string, SourceEntry>;
  spotCheckVerdicts: Map<string, SpotCheckVerdict>;
  onSpotCheck: (verdict: SpotCheckVerdict) => void;
  // The editor's draft approve/reject decision (Task 4), if made this session.
  verdict?: LayerVerdict | undefined;
  // The committed verdict from approvals.json, if the guide already has one.
  approval?: LayerRecord | undefined;
  onApprove: () => void;
  onReject: (note: string) => void;
  onClearVerdict: () => void;
};

const STATUS_LABEL: Record<LayerRecord["status"], string> = {
  draft: "Unreviewed",
  approved: "Approved",
  rejected: "Rejected",
};

// One layer's report card. FR-E1: an unapproved layer reads visually distinct
// from an approved one. Flag count is always visible; expanding reveals the
// flagged rows (FR-E2), the spot-check panel (FR-E3), and approve/reject
// (FR-E4). The badge shows the effective status: draft decision over committed
// approval over "draft".
export function LayerReviewCard({
  layer,
  flaggedRows,
  unflaggedRows,
  sourceById,
  spotCheckVerdicts,
  onSpotCheck,
  verdict,
  approval,
  onApprove,
  onReject,
  onClearVerdict,
}: LayerReviewCardProps) {
  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const status = verdict?.status ?? approval?.status ?? "draft";
  const approved = status === "approved";
  const flagCount = layer.flaggedItemIds.length;

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
        <span className="font-bold">{layer.id}</span>
        <span className="flex items-center gap-2 text-xs">
          <Badge
            variant="outline"
            className={cn(
              "font-bold",
              flagCount > 0 ? "text-missable" : "text-ink-soft",
            )}
          >
            {flagCount} flagged
          </Badge>
          <span className="text-ink-soft">{layer.rowCount} rows</span>
          <Badge
            variant={approved ? "default" : "outline"}
            className={cn("uppercase", !approved && "text-missable")}
          >
            {STATUS_LABEL[status]}
          </Badge>
        </span>
      </button>

      {layer.anomalies.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft">
          {layer.anomalies.map((anomaly) => (
            <li key={anomaly}>{anomaly}</li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <>
          {flaggedRows.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              No flagged rows — nothing to verify on this layer.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {flaggedRows.map((row) => (
                <FlaggedRowView
                  key={row.id}
                  row={row}
                  sourceById={sourceById}
                />
              ))}
            </ul>
          )}

          <SpotCheckPanel
            unflaggedRows={unflaggedRows}
            sourceById={sourceById}
            verdicts={spotCheckVerdicts}
            onRecord={onSpotCheck}
          />

          <div className="mt-4 border-t border-line pt-3">
            {verdict ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span
                  className={cn(
                    "font-bold uppercase",
                    verdict.status === "approved"
                      ? "text-primary"
                      : "text-missable",
                  )}
                >
                  {STATUS_LABEL[verdict.status]}
                </span>
                {verdict.note ? (
                  <span className="text-ink-soft">“{verdict.note}”</span>
                ) : null}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="text-ink-soft"
                  onClick={() => {
                    onClearVerdict();
                    setRejecting(false);
                    setNote("");
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={onApprove}>
                  <Check aria-hidden />
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejecting((value) => !value)}
                >
                  <X aria-hidden />
                  Reject
                </Button>
                {rejecting ? (
                  <span className="flex flex-1 items-center gap-2">
                    <Input
                      type="text"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="rejection note (required — feeds the recompile)"
                      aria-label={`Rejection note for ${layer.id}`}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!note.trim()}
                      className="border-missable font-bold text-missable"
                      onClick={() => {
                        onReject(note);
                        setRejecting(false);
                        setNote("");
                      }}
                    >
                      Submit
                    </Button>
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : null}
    </Card>
  );
}
