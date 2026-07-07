import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ProgressSlice } from "@/types/progressSlice";
import type { MatrixWidget } from "../../schema";
import { FlagMark } from "../FlagMark";

type MatrixProps = {
  widget: MatrixWidget;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
};

type Cell = MatrixWidget["cells"][number];

// `cells` is sparse — not every row × column intersection exists. Key on a
// NUL-joined pair (labels/IDs never contain NUL) so lookups stay O(1).
const cellKey = (rowId: string, columnId: string) => `${rowId} ${columnId}`;

// §7 S3: matrices render as a real scrollable grid. Row headers down the left,
// column headers across the top; the left column and header row stay pinned so
// wide matrices scroll cleanly on the phone. Full version of the §9.3 degraded
// list — guide data is untouched by the upgrade (§9.2 #4).
export function Matrix({ widget, progress, onToggle }: MatrixProps) {
  const byPair = new Map<string, Cell>(
    widget.cells.map((cell) => [cellKey(cell.rowId, cell.columnId), cell]),
  );

  return (
    <ScrollArea className="w-full">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card" />
            {widget.columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className="border-b border-line px-2 py-1 text-center align-bottom text-xs font-bold text-ink-soft"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {widget.rows.map((row) => (
            <tr key={row.id}>
              <th
                scope="row"
                className="sticky left-0 z-10 border-b border-line bg-card px-2 py-1 text-left text-xs font-bold text-ink-soft"
              >
                {row.label}
              </th>
              {widget.columns.map((column) => {
                const cell = byPair.get(cellKey(row.id, column.id));
                if (!cell) {
                  return (
                    <td
                      key={column.id}
                      className="border-b border-line bg-paper-dim"
                    />
                  );
                }
                const done = progress.doneIds.has(cell.itemId);
                const label = `${row.label} × ${column.label}`;
                return (
                  <td key={column.id} className="border-b border-line p-0">
                    <div
                      className={cn(
                        "flex min-h-11 min-w-11 items-center justify-center gap-1 px-2 py-1",
                        done && "bg-primary/15",
                      )}
                    >
                      <Checkbox
                        checked={done}
                        onCheckedChange={() => onToggle(cell.itemId)}
                        aria-label={label}
                      />
                      {cell.confidence === "flagged" ? <FlagMark /> : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
