import type { GuideFile } from "../schema";

export type UpcomingMissable = {
  stepId: string;
  deadline: string;
  location?: string;
};

// FR-B5 / P3: the missables the player is heading toward — missable steps
// strictly ahead of the current pointer, not yet done and not yet acknowledged.
// Limited to the near horizon (the current chapter and the next, controlled by
// `lookaheadChapters`) so the banner warns about what's *coming up* rather than
// every missable in the game (§7 "when one is upcoming"). The current step's own
// missable stays on its row, not the banner. The deadline is a human string, so
// this is "what's coming", not a computed point of no return.
export function upcomingMissables(
  guide: GuideFile,
  currentStepId: string | null,
  doneIds: ReadonlySet<string>,
  acknowledgedIds: ReadonlySet<string>,
  lookaheadChapters = 1,
): UpcomingMissable[] {
  const flat = guide.chapters.flatMap((chapter, chapterIndex) =>
    chapter.steps.map((step) => ({ step, chapterIndex })),
  );
  const currentIndex = currentStepId
    ? flat.findIndex(({ step }) => step.id === currentStepId)
    : -1;
  const currentChapter =
    currentIndex >= 0 ? flat[currentIndex]?.chapterIndex : -1;
  const maxChapter = (currentChapter ?? -1) + lookaheadChapters;

  const upcoming: UpcomingMissable[] = [];
  flat.forEach(({ step, chapterIndex }, index) => {
    if (!step.missable) return;
    if (index <= currentIndex) return;
    if (chapterIndex > maxChapter) return;
    if (doneIds.has(step.id) || acknowledgedIds.has(step.id)) return;
    upcoming.push({
      stepId: step.id,
      deadline: step.missable.deadline,
      ...(step.location ? { location: step.location } : {}),
    });
  });
  return upcoming;
}
