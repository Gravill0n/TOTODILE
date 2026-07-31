import type { CounterWidget, Widget } from "@/schema";
import type { ProgressSlice } from "@/types/progressSlice";

// The prop shape every toggle-style renderer shares: data + callbacks in,
// UI out (§22.1 purity). MapPins adds resolveAsset; Counter swaps onToggle
// for its adjust/reset pair.
export type WidgetProps<W extends Widget> = {
  widget: W;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
};

// The one highlight treatment, so the seven primitives cannot each invent
// their own. A ring rather than a fill: the row may also be done, and done
// already owns the strike-through and the tick.
export function highlightClass(
  progress: ProgressSlice,
  itemId: string,
): string {
  return progress.highlightIds?.has(itemId)
    ? "ring-2 ring-primary ring-offset-1 ring-offset-card rounded-sm"
    : "";
}

export type CounterProps = Omit<WidgetProps<CounterWidget>, "onToggle"> & {
  onAdjust: (itemId: string, delta: number) => void;
  onReset: (itemId: string) => void;
};
