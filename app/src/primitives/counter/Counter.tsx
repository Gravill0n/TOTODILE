import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProgressSlice } from "../../progress/progressSlice";
import type { CounterWidget } from "../../schema";

type CounterProps = {
  widget: CounterWidget;
  progress: ProgressSlice;
  onAdjust: (itemId: string, delta: number) => void;
  onReset: (itemId: string) => void;
};

// FR-B3: increment / decrement / reset, values persist like checkboxes.
// Reaching the target shows a done treatment; the value itself never
// auto-converts to a done item-state (that interplay belongs to RA sync,
// Phase 4).
export function Counter({ widget, progress, onAdjust, onReset }: CounterProps) {
  return (
    <ul className="space-y-2">
      {widget.counters.map((counter) => {
        const value = progress.counterValues[counter.itemId] ?? 0;
        const complete = value >= counter.target;
        return (
          <li key={counter.itemId} className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <p className="text-sm">{counter.label}</p>
              <p
                className={cn(
                  "text-xs",
                  complete ? "font-bold text-primary" : "text-ink-soft",
                )}
              >
                {value} / {counter.target}
                {complete ? " ✓" : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onAdjust(counter.itemId, -1)}
              aria-label={`Decrement ${counter.label}`}
            >
              −
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => onAdjust(counter.itemId, 1)}
              aria-label={`Increment ${counter.label}`}
              className="text-lg font-bold"
            >
              +
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onReset(counter.itemId)}
              aria-label={`Reset ${counter.label}`}
              className="text-xs"
            >
              ↺
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
