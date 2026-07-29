import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChapterRail } from "./ChapterRail";
import type { ChapterProgress } from "./chapterProgress";

type ChapterSheetProps = {
  chapters: ChapterProgress[];
  slug: string;
  visitId: string;
  onOpenVisit: (visitId: string) => void;
  onClose: () => void;
};

// The chapters bottom sheet: the same rail the browse posture keeps beside the
// visit, on a posture that has no room for a column. One component means the
// two postures cannot drift — the phone gets the progress bars and the visit
// list, not a flat list of titles.
//
// Radix Sheet gives the focus trap, scroll lock and escape-to-close (#4); the
// parent mounts it only while open, so onOpenChange(false) maps to onClose.
export function ChapterSheet({
  chapters,
  slug,
  visitId,
  onOpenVisit,
  onClose,
}: ChapterSheetProps) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        closeLabel="Close chapter list"
        className="max-h-[60dvh] rounded-t-xl"
      >
        <SheetHeader>
          <SheetTitle className="text-sm font-bold text-ink-soft uppercase">
            Chapters
          </SheetTitle>
          <SheetDescription className="sr-only">
            Jump to a visit without losing your place.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <ChapterRail
            chapters={chapters}
            slug={slug}
            visitId={visitId}
            onOpenVisit={onOpenVisit}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
