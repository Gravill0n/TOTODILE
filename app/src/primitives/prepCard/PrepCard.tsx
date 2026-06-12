import type { ProgressSlice } from "../../progress/progressSlice";
import type { PrepCardWidget } from "../../schema";
import { FlagMark } from "../FlagMark";

type PrepCardProps = {
  widget: PrepCardWidget;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
};

// §9.3 degraded list — quantity-annotated checklist; the full prep-card
// presentation arrives in Phase 5.
export function PrepCard({ widget, progress, onToggle }: PrepCardProps) {
  return (
    <ul className="space-y-1 text-sm">
      {widget.items.map((item) => {
        const done = progress.doneIds.has(item.itemId);
        return (
          <li key={item.itemId} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={done}
              onChange={() => onToggle(item.itemId)}
              aria-label={item.label}
              className="mt-0.5 size-4 shrink-0 accent-accent"
            />
            <span className={done ? "line-through opacity-60" : ""}>
              {item.label}
              {item.quantity !== undefined ? (
                <span className="ml-1 rounded border border-line px-1 text-xs">
                  ×{item.quantity}
                </span>
              ) : null}
              {item.confidence === "flagged" ? (
                <>
                  {" "}
                  <FlagMark />
                </>
              ) : null}
              {item.note ? (
                <span className="block text-xs text-ink-soft">{item.note}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
