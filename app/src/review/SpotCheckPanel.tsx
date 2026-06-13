import { useState } from "react";
import type { SourceEntry, SpotCheckVerdict } from "../schema";
import type { FlaggedRow } from "./flaggedRows";
import { SpotCheckRow } from "./SpotCheckRow";
import { DEFAULT_SAMPLE, sampleRows } from "./spotCheck";

type SpotCheckPanelProps = {
  unflaggedRows: FlaggedRow[];
  sourceById: Map<string, SourceEntry>;
  verdicts: Map<string, SpotCheckVerdict>;
  onRecord: (verdict: SpotCheckVerdict) => void;
};

// FR-E3/E4 — "🎲 spot-check N": draw N random confident rows, show each beside
// its source, record pass/fail. Recorded verdicts persist across re-rolls and
// reloads (keyed by itemId in the review store).
export function SpotCheckPanel({
  unflaggedRows,
  sourceById,
  verdicts,
  onRecord,
}: SpotCheckPanelProps) {
  const [sampled, setSampled] = useState<FlaggedRow[]>([]);
  const sampleSize = Math.min(DEFAULT_SAMPLE, unflaggedRows.length);

  const passes = [...verdicts.values()].filter(
    (v) => v.verdict === "pass",
  ).length;
  const fails = verdicts.size - passes;

  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={sampleSize === 0}
          onClick={() => setSampled(sampleRows(unflaggedRows, DEFAULT_SAMPLE))}
          className="rounded border border-line bg-card px-3 py-1 text-sm disabled:opacity-50"
        >
          🎲 Spot-check {sampleSize}
        </button>
        {sampled.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              setSampled(sampleRows(unflaggedRows, DEFAULT_SAMPLE))
            }
            className="text-sm text-ink-soft underline"
          >
            Re-roll
          </button>
        ) : null}
        {verdicts.size > 0 ? (
          <span className="text-sm text-ink-soft">
            Spot-checks: {verdicts.size} — {passes} pass, {fails} fail
          </span>
        ) : sampleSize === 0 ? (
          <span className="text-sm text-ink-soft">
            No unflagged rows to spot-check.
          </span>
        ) : null}
      </div>

      {sampled.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {sampled.map((row) => (
            <SpotCheckRow
              key={row.id}
              row={row}
              sourceById={sourceById}
              verdict={verdicts.get(row.itemId)}
              onRecord={onRecord}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
