import { useState } from "react";
import type { SourceEntry, SpotCheckVerdict } from "../schema";
import type { FlaggedRow } from "./flaggedRows";
import { RowSourceColumns } from "./RowSourceColumns";

type SpotCheckRowProps = {
  row: FlaggedRow;
  sourceById: Map<string, SourceEntry>;
  verdict?: SpotCheckVerdict | undefined;
  onRecord: (verdict: SpotCheckVerdict) => void;
};

// One sampled row: the row beside its source (RowSourceColumns) plus a
// pass/fail verdict and an optional note, recorded immediately (FR-E3).
export function SpotCheckRow({
  row,
  sourceById,
  verdict,
  onRecord,
}: SpotCheckRowProps) {
  const [note, setNote] = useState(verdict?.note ?? "");

  const record = (value: SpotCheckVerdict["verdict"]) => {
    const trimmed = note.trim();
    onRecord({
      itemId: row.itemId,
      verdict: value,
      ...(trimmed ? { note: trimmed } : {}),
    });
  };

  const current = verdict?.verdict;

  return (
    <li className="rounded-lg border border-line bg-card p-3">
      <RowSourceColumns row={row} sourceById={sourceById} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => record("pass")}
          aria-pressed={current === "pass"}
          className={`rounded border px-2 py-0.5 text-sm ${
            current === "pass"
              ? "border-accent bg-accent/10 font-bold text-accent"
              : "border-line"
          }`}
        >
          ✓ Pass
        </button>
        <button
          type="button"
          onClick={() => record("fail")}
          aria-pressed={current === "fail"}
          className={`rounded border px-2 py-0.5 text-sm ${
            current === "fail"
              ? "border-missable bg-paper-dim font-bold text-missable"
              : "border-line"
          }`}
        >
          ✗ Fail
        </button>
        <input
          type="text"
          value={note}
          placeholder="note (optional)"
          aria-label={`Note for ${row.title}`}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (current) record(current);
          }}
          className="flex-1 rounded border border-line bg-paper px-2 py-0.5 text-sm"
        />
      </div>
    </li>
  );
}
