import { useState } from "react";
import type { LayerRecord, SourceEntry, SpotCheckVerdict } from "../schema";
import { FlaggedRowView } from "./FlaggedRowView";
import type { FlaggedRow } from "./flaggedRows";
import type { LayerReport } from "./layerRoster";
import { SpotCheckPanel } from "./SpotCheckPanel";

type LayerReviewCardProps = {
  layer: LayerReport;
  flaggedRows: FlaggedRow[];
  unflaggedRows: FlaggedRow[];
  sourceById: Map<string, SourceEntry>;
  verdicts: Map<string, SpotCheckVerdict>;
  onRecord: (verdict: SpotCheckVerdict) => void;
  // The recorded verdict for this layer, if one exists yet (Task 4 writes it).
  approval?: LayerRecord | undefined;
};

const STATUS_LABEL: Record<LayerRecord["status"], string> = {
  draft: "Unreviewed",
  approved: "Approved",
  rejected: "Rejected",
};

// One layer's report card. FR-E1: an unapproved layer reads visually distinct
// from an approved one (missable accent vs. calm). Flag count is always
// visible; expanding reveals the flagged rows beside their sources (FR-E2).
export function LayerReviewCard({
  layer,
  flaggedRows,
  unflaggedRows,
  sourceById,
  verdicts,
  onRecord,
  approval,
}: LayerReviewCardProps) {
  const [open, setOpen] = useState(false);
  const approved = approval?.status === "approved";
  const flagCount = layer.flaggedItemIds.length;

  return (
    <section
      className={`rounded-lg border p-4 ${
        approved ? "border-line bg-card" : "border-missable bg-paper-dim"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-baseline justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="font-bold">{layer.id}</span>
        <span className="flex items-center gap-2 text-xs">
          <span
            className={`rounded px-2 py-0.5 font-bold ${
              flagCount > 0 ? "text-missable" : "text-ink-soft"
            }`}
          >
            {flagCount} flagged
          </span>
          <span className="text-ink-soft">{layer.rowCount} rows</span>
          <span
            className={`rounded px-2 py-0.5 uppercase ${
              approved ? "text-ink-soft" : "font-bold text-missable"
            }`}
          >
            {STATUS_LABEL[approval?.status ?? "draft"]}
          </span>
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
            verdicts={verdicts}
            onRecord={onRecord}
          />
        </>
      ) : null}
    </section>
  );
}
