import { WidgetRenderer } from "../primitives/WidgetRenderer";
import type { ProgressSlice } from "../progress/progressSlice";
import type { Widget } from "../schema";

export type WidgetHandlers = {
  onToggle: (itemId: string) => void;
  onAdjustCounter: (itemId: string, delta: number) => void;
  onResetCounter: (itemId: string) => void;
  resolveAsset: (path: string) => string;
};

type WidgetDeckProps = WidgetHandlers & {
  widgets: Widget[];
  progress: ProgressSlice;
};

// A stack of widget cards — used by the desktop side panels and the phone
// widget sheet alike (§7 S3: same data, different posture).
export function WidgetDeck({
  widgets,
  progress,
  ...handlers
}: WidgetDeckProps) {
  if (widgets.length === 0) {
    return <p className="text-xs text-ink-soft">No widgets here.</p>;
  }
  return (
    <div className="space-y-4">
      {widgets.map((widget) => (
        <section
          key={widget.id}
          className="rounded-lg border border-line bg-card p-3"
        >
          <h3 className="mb-2 text-sm font-bold">{widget.title}</h3>
          <WidgetRenderer widget={widget} progress={progress} {...handlers} />
        </section>
      ))}
    </div>
  );
}
