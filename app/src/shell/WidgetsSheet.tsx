import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
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
// Radix Sheet supplies the focus trap, scroll lock and escape-to-close (#4).
export function WidgetsSheet({
  widgets,
  progress,
  wholeGame,
  onWholeGameChange,
  onClose,
  ...handlers
}: WidgetsSheetProps) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        closeLabel="Close widgets"
        className="max-h-[70dvh] rounded-t-xl"
      >
        <SheetHeader className="flex-row items-center justify-between pr-10">
          <SheetTitle className="text-sm font-bold text-ink-soft uppercase">
            Widgets
          </SheetTitle>
          <SheetDescription className="sr-only">
            The widgets in scope for where you are.
          </SheetDescription>
          <Label className="flex items-center gap-2 text-xs font-normal text-ink-soft">
            <Switch
              checked={wholeGame}
              onCheckedChange={onWholeGameChange}
              aria-label="Whole game"
            />
            Whole game
          </Label>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <WidgetDeck widgets={widgets} progress={progress} {...handlers} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
