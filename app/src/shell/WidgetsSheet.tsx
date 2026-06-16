import type { ProgressSlice } from "../progress/progressSlice";
import type { Widget } from "../schema";
import { WidgetDeck, type WidgetHandlers } from "./WidgetDeck";

type WidgetsSheetProps = WidgetHandlers & {
  widgets: Widget[];
  progress: ProgressSlice;
  wholeGame: boolean;
  onWholeGameChange: (wholeGame: boolean) => void;
  onClose: () => void;
};

// The 🧩 bottom sheet (S3, phone posture): the widgets in scope for where the
// pointer is — chapter, location (every visit there), or visit — by default,
// whole-game toggle visible (FR-A5). The list arrives pre-resolved (widgetScope).
export function WidgetsSheet({
  widgets,
  progress,
  wholeGame,
  onWholeGameChange,
  onClose,
  ...handlers
}: WidgetsSheetProps) {
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close widgets"
        onClick={onClose}
        className="flex-1 bg-ink/40"
      />
      <div className="max-h-[70dvh] overflow-y-auto rounded-t-xl border-t border-line bg-paper p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-soft uppercase">Widgets</h2>
          <label className="flex items-center gap-1 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={wholeGame}
              onChange={(event) => onWholeGameChange(event.target.checked)}
              aria-label="Whole game"
            />
            Whole game
          </label>
        </div>
        <WidgetDeck widgets={widgets} progress={progress} {...handlers} />
      </div>
    </div>
  );
}
