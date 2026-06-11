import type { ProgressSlice } from "../../progress/progressSlice";
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
            <input
              type="checkbox"
              checked={done}
              onChange={() => onToggle(row.itemId)}
              aria-label={row.label}
              className="mt-0.5 size-4 shrink-0 accent-accent"
            />
            <span className={done ? "line-through opacity-60" : ""}>
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
