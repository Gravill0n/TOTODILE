import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { idTail } from "@/schema";
import type { ChapterProgress } from "./chapterProgress";

type ChapterRailProps = {
  chapters: ChapterProgress[];
  slug: string;
  /** The fully-qualified id of the visit the URL points at. */
  visitId: string;
  onOpenVisit: (visitId: string) => void;
};

// A real anchor, not a router Link: the rail stays free of router context (so
// it renders bare) while middle-click, copy-link and open-in-new-tab keep
// working on the address the app actually uses. A plain click is handled in
// the app instead, the way a Link would.
function isPlainClick(event: React.MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

// Where you are in the whole game, on one rail: a chapter per row with its
// completion, expanding to the visits inside it. Fed entirely by
// chapterProgress, so these percentages and the header's total are the same
// arithmetic over the same done set — they cannot drift.
//
// A location reached twice is two rows here, one per visit, because that is
// what the player walks (CLAUDE.md compiler note).
export function ChapterRail({
  chapters,
  slug,
  visitId,
  onOpenVisit,
}: ChapterRailProps) {
  const chapterOfVisit =
    chapters.find((chapter) =>
      chapter.visits.some((visit) => visit.visitId === visitId),
    )?.chapterId ?? "";
  // Opening a visit expands its chapter; browsing other chapters from there is
  // free, and stays until the URL moves again.
  const [open, setOpen] = useState(chapterOfVisit);
  useEffect(() => setOpen(chapterOfVisit), [chapterOfVisit]);

  const percentOf = (done: number, total: number) =>
    total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <nav aria-label="Chapter progress">
      <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
        {chapters.map((chapter, index) => {
          const here = chapter.chapterId === chapterOfVisit;
          const percent = percentOf(chapter.done, chapter.total);
          return (
            <AccordionItem
              key={chapter.chapterId}
              value={chapter.chapterId}
              className="border-line"
            >
              {/* The trigger is a disclosure for one chapter, so that is its
                  name; the number is decoration and the completion is
                  announced by the progress bar below it. */}
              <AccordionTrigger
                aria-label={chapter.title}
                className="items-center py-2"
              >
                <span className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      here ? "text-primary" : "text-ink-soft",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{chapter.title}</span>
                </span>
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    here ? "text-primary" : "text-ink-soft",
                  )}
                >
                  {`${percent}%`}
                </span>
              </AccordionTrigger>
              {/* Outside the trigger: a progress bar inside a button is neither
                  valid nor announceable. */}
              <div className="flex items-center gap-2 pb-2">
                <Progress
                  value={percent}
                  aria-label={`${chapter.title} completion`}
                  className={here ? undefined : "opacity-60"}
                />
                <span className="shrink-0 font-mono text-xs text-ink-soft tabular-nums">
                  {`${chapter.done} / ${chapter.total}`}
                </span>
              </div>
              <AccordionContent className="pb-2">
                <ul>
                  {chapter.visits.map((visit) => {
                    const displayed = visit.visitId === visitId;
                    return (
                      <li key={visit.visitId}>
                        <a
                          href={`#/guide/${slug}/chapter/${idTail(chapter.chapterId)}/visit/${idTail(visit.visitId)}`}
                          onClick={(event) => {
                            if (!isPlainClick(event)) return;
                            event.preventDefault();
                            onOpenVisit(visit.visitId);
                          }}
                          className={cn(
                            "flex min-h-9 items-center justify-between gap-2 border-l-2 py-1 pl-2 text-sm",
                            displayed
                              ? "border-primary font-bold"
                              : "border-transparent text-ink-soft",
                          )}
                        >
                          <span className="truncate">{visit.locationName}</span>
                          <span className="shrink-0 font-mono text-xs tabular-nums">
                            {`${visit.done} / ${visit.total}`}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </nav>
  );
}
