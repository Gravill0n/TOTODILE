import type { Chapter } from "../schema";

type ChapterSheetProps = {
  chapters: Chapter[];
  onJump: (chapterId: string) => void;
  onClose: () => void;
};

// The ☰ bottom sheet: jump to a chapter without losing the pointer.
export function ChapterSheet({ chapters, onJump, onClose }: ChapterSheetProps) {
  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close chapter list"
        onClick={onClose}
        className="flex-1 bg-ink/40"
      />
      <nav
        aria-label="Chapters"
        className="max-h-[60dvh] overflow-y-auto rounded-t-xl border-t border-line bg-card p-4"
      >
        <h2 className="mb-2 text-sm font-bold text-ink-soft uppercase">
          Chapters
        </h2>
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
    </div>
  );
}
