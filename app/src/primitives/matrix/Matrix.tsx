import type { ProgressSlice } from "../../progress/progressSlice";
import type { MatrixWidget } from "../../schema";
import { FlagMark } from "../FlagMark";

type MatrixProps = {
  widget: MatrixWidget;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
};

// §9.3 degraded list — every cell as a "row × column" line. The full
// scrollable-grid renderer arrives in Phase 4; guide data is untouched by
// that upgrade.
export function Matrix({ widget, progress, onToggle }: MatrixProps) {
  const rowLabels = new Map(widget.rows.map((row) => [row.id, row.label]));
  const columnLabels = new Map(
    widget.columns.map((column) => [column.id, column.label]),
  );
  return (
    <ul className="space-y-1 text-sm">
      {widget.cells.map((cell) => {
        const done = progress.doneIds.has(cell.itemId);
        const label = `${rowLabels.get(cell.rowId) ?? cell.rowId} × ${
          columnLabels.get(cell.columnId) ?? cell.columnId
        }`;
        return (
          <li key={cell.itemId} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={done}
              onChange={() => onToggle(cell.itemId)}
              aria-label={label}
              className="mt-0.5 size-4 shrink-0 accent-accent"
            />
            <span className={done ? "line-through opacity-60" : ""}>
              {label}
              {cell.confidence === "flagged" ? (
                <>
                  {" "}
                  <FlagMark />
                </>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
