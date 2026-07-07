import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { DataTableWidget } from "@/schema";
import { FlagMark } from "../FlagMark";
import type { WidgetProps } from "../widgetProps";

type DataTableProps = WidgetProps<DataTableWidget>;

// §7 S3: tables render as a real table in the browse posture and as
// stacked cards in the play posture. Only rows with `checkable: true`
// get a checkbox; informational rows are display-only.
export function DataTable({ widget, progress, onToggle }: DataTableProps) {
  const firstColumn = widget.columns[0];
  if (!firstColumn) return null;
  const hasCheckable = widget.rows.some((row) => row.checkable);

  const rowCheckbox = (row: (typeof widget.rows)[number]) => (
    <Checkbox
      checked={progress.doneIds.has(row.itemId)}
      onCheckedChange={() => onToggle(row.itemId)}
      aria-label={`Done: ${row.cells[firstColumn.id] ?? row.itemId}`}
    />
  );

  return (
    <>
      <ScrollArea className="hidden w-full md:block">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {hasCheckable ? <th aria-label="Done" /> : null}
              {widget.columns.map((column) => (
                <th
                  key={column.id}
                  className="border-b border-line px-2 py-1 text-left text-xs text-ink-soft"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.rows.map((row) => (
              <tr key={row.itemId}>
                {hasCheckable ? (
                  <td className="border-b border-line px-1">
                    {row.checkable ? rowCheckbox(row) : null}
                  </td>
                ) : null}
                {widget.columns.map((column, index) => (
                  <td
                    key={column.id}
                    className="border-b border-line px-2 py-1"
                  >
                    {row.cells[column.id] ?? ""}
                    {index === 0 && row.confidence === "flagged" ? (
                      <>
                        {" "}
                        <FlagMark />
                      </>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <ul className="space-y-2 md:hidden">
        {widget.rows.map((row) => (
          <li
            key={row.itemId}
            className="rounded border border-line bg-card p-2 text-sm"
          >
            <p className="flex items-center gap-2 font-bold">
              {row.checkable ? rowCheckbox(row) : null}
              {row.cells[firstColumn.id] ?? row.itemId}
              {row.confidence === "flagged" ? <FlagMark /> : null}
            </p>
            {widget.columns.slice(1).map((column) =>
              row.cells[column.id] ? (
                <p key={column.id} className="mt-1 text-xs">
                  <span className="text-ink-soft">{column.label}: </span>
                  {row.cells[column.id]}
                </p>
              ) : null,
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
