import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WidgetRenderer } from "../primitives/WidgetRenderer";
import type { ProgressSlice } from "../progress/progressSlice";
import type { Widget } from "../schema";
import type { WidgetHandlers } from "./WidgetDeck";

type WidgetDialogProps = WidgetHandlers & {
  widget: Widget;
  progress: ProgressSlice;
  onClose: () => void;
};

// Browse posture (S3): a rail launcher opens the widget full-size here —
// wide like the ZoomableImage lightbox, body scrolling under the pinned
// title. Radix supplies focus trap, escape/overlay close, focus restore.
export function WidgetDialog({
  widget,
  progress,
  onClose,
  ...handlers
}: WidgetDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{widget.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Track this widget without leaving the walkthrough.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[75dvh] overflow-y-auto">
          <WidgetRenderer widget={widget} progress={progress} {...handlers} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
