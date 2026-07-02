import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProgressSlice } from "../../progress/progressSlice";
import { type CounterWidget, counterTarget } from "../../schema";

type CounterProps = {
  widget: CounterWidget;
  progress: ProgressSlice;
  onAdjust: (itemId: string, delta: number) => void;
  onReset: (itemId: string) => void;
};

// FR-B3: increment / decrement / reset, values persist like checkboxes.
// Reaching the target shows a done treatment; the value itself never
// auto-converts to a done item-state (that interplay belongs to RA sync,
// Phase 4). A derived entry (#5) is read-only: its value is the count of
// checked derivedFrom ids — no controls, no counterValues.
export function Counter({ widget, progress, onAdjust, onReset }: CounterProps) {
  return (
    <ul className="space-y-2">
      {widget.counters.map((counter) => {
        const derived = counter.derivedFrom !== undefined;
        const value = derived
          ? (counter.derivedFrom?.filter((id) => progress.doneIds.has(id))
              .length ?? 0)
          : (progress.counterValues[counter.itemId] ?? 0);
        const target = counterTarget(counter);
        const complete = value >= target;
        return (
          <li key={counter.itemId} className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <p className="text-sm">{counter.label}</p>
              <p
                className={cn(
                  "flex items-center gap-1 text-xs",
                  complete ? "font-bold text-primary" : "text-ink-soft",
                )}
              >
                {value} / {target}
                {complete ? <Check className="size-3" aria-hidden /> : null}
              </p>
            </div>
            {derived ? null : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onAdjust(counter.itemId, -1)}
                  aria-label={`Decrement ${counter.label}`}
                >
                  <Minus />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => onAdjust(counter.itemId, 1)}
                  aria-label={`Increment ${counter.label}`}
                >
                  <Plus />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => onReset(counter.itemId)}
                  aria-label={`Reset ${counter.label}`}
                >
                  <RotateCcw />
                </Button>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
