import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Chapter } from "../schema";

type ChapterSheetProps = {
  chapters: Chapter[];
  onJump: (chapterId: string) => void;
  onClose: () => void;
};

// The ☰ bottom sheet: jump to a chapter without losing the pointer. Radix
// Sheet gives the focus trap, scroll lock and escape-to-close (#4); the parent
// mounts it only while open, so onOpenChange(false) maps to onClose.
export function ChapterSheet({ chapters, onJump, onClose }: ChapterSheetProps) {
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
            Jump to a chapter without losing your place.
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Chapters" className="overflow-y-auto px-4 pb-4">
          <ul>
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => onJump(chapter.id)}
                  className="w-full border-b border-line py-2 text-left"
                >
                  {chapter.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
