import { TriangleAlert } from "lucide-react";
import type { SourceEntry } from "../schema";
import type { FlaggedRow } from "./flaggedRows";
import { RowSourceColumns } from "./RowSourceColumns";

type FlaggedRowViewProps = {
  row: FlaggedRow;
  sourceById: Map<string, SourceEntry>;
};

// FR-E2/E3 — a flagged row beside the source(s) it traces to.
export function FlaggedRowView({ row, sourceById }: FlaggedRowViewProps) {
  return (
    <li className="rounded-lg border border-line bg-card p-3">
      <RowSourceColumns
        row={row}
        sourceById={sourceById}
        eyebrow={
          <span className="inline-flex items-center gap-1">
            <TriangleAlert className="size-3" aria-hidden />
            flagged
          </span>
        }
        eyebrowClassName="text-missable"
      />
    </li>
  );
}
