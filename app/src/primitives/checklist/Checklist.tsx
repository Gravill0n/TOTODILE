import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ProgressSlice } from "@/types/progressSlice";
import type { ChecklistWidget } from "../../schema";
import { FlagMark } from "../FlagMark";

type ChecklistProps = {
  widget: ChecklistWidget;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
};

export function Checklist({ widget, progress, onToggle }: ChecklistProps) {
  return (
    <ul className="space-y-1 text-sm">
      {widget.rows.map((row) => {
        const done = progress.doneIds.has(row.itemId);
        return (
          <li key={row.itemId} className="flex items-start gap-2">
            <Checkbox
              checked={done}
              onCheckedChange={() => onToggle(row.itemId)}
              aria-label={row.label}
              className="mt-0.5"
            />
            <span className={cn(done && "line-through opacity-60")}>
              {row.label}
              {row.confidence === "flagged" ? (
                <>
                  {" "}
                  <FlagMark />
                </>
              ) : null}
              {row.note ? (
                <span className="block text-xs text-ink-soft">{row.note}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
