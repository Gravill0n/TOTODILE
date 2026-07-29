import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { Widget, WidgetScope } from "@/schema";
import type { ProgressSlice } from "@/types/progressSlice";
import { type WidgetHandlers, WidgetStack } from "./WidgetStack";

type WidgetsSheetProps = WidgetHandlers & {
  widgets: Widget[];
  progress: ProgressSlice;
  labelForScope?: (scope: WidgetScope) => string;
  order?: readonly string[];
  pinnedIds?: readonly string[];
  onOrderChange?: (widgetIds: string[]) => void;
  onTogglePin?: (widgetId: string) => void;
  wholeGame: boolean;
  onWholeGameChange: (wholeGame: boolean) => void;
  onClose: () => void;
};

// The widgets bottom sheet (S3, phone posture): the widgets in scope for where
// pointer is — chapter, location (every visit there), or visit — by default,
// whole-game toggle visible (FR-A5). The list arrives pre-resolved (widgetScope).
// Radix Sheet supplies the focus trap, scroll lock and escape-to-close (#4).
export function WidgetsSheet({
  widgets,
  progress,
  labelForScope,
  order,
  pinnedIds,
  onOrderChange,
  onTogglePin,
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
        className="max-h-[70dvh] rounded-t-xl pb-[env(safe-area-inset-bottom)]"
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
        {/* Sticky header (#3): flex-1 + min-h-0 make this div the scroll
            container inside the sheet's flex column, so the title +
            whole-game toggle stay pinned while the list scrolls under. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <WidgetStack
            widgets={widgets}
            progress={progress}
            labelForScope={labelForScope}
            order={order}
            pinnedIds={pinnedIds}
            onOrderChange={onOrderChange}
            onTogglePin={onTogglePin}
            {...handlers}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
