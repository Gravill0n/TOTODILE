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

export type CounterProps = Omit<WidgetProps<CounterWidget>, "onToggle"> & {
  onAdjust: (itemId: string, delta: number) => void;
  onReset: (itemId: string) => void;
};
