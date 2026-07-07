import type { Chapter, GuideFile, Step, Visit } from "@/schema";

// Pure helpers over the guide tree — shared by the spine feature, progress
// stats, and the app screens without creating feature→feature edges.

// Guide images are referenced relative to the guide folder (§6.2, FR-A6).
export function guideAssetUrl(slug: string, relativePath: string): string {
  return `guides/${slug}/${relativePath}`;
}

export function stepDomId(stepId: string): string {
  return `step-${stepId}`;
}

export function chapterDomId(chapterId: string): string {
  return `chapter-${chapterId}`;
}

// Spine order, made executable for the chapter→visit→step tree: array order is
// authoritative (as it always was for chapters), so steps flatten visit by
// visit, chapter by chapter. This is the ordered ID list the explicit pointer
// walks — `advancePointer` works unchanged because it only needs the flat
// order, which now spans visit and chapter boundaries (Workstream A A5).
export function chapterSteps(chapter: Chapter): Step[] {
  return chapter.visits.flatMap((visit) => visit.steps);
}

export function guideSteps(guide: GuideFile): Step[] {
  return guide.chapters.flatMap(chapterSteps);
}

export function guideStepIds(guide: GuideFile): string[] {
  return guideSteps(guide).map((step) => step.id);
}

// A step's one-line headline: its keyword beats joined for places that need a
// single string (labels, the review worklist, aria text). The terse beats are
// shown verbatim on the play view; `detail` carries the full prose (#11).
export function stepHeadline(step: Step): string {
  return step.keywords.join(" · ");
}

export function chapterOf(
  guide: GuideFile,
  stepId: string | null,
): Chapter | undefined {
  if (stepId === null) return undefined;
  return guide.chapters.find((c) =>
    c.visits.some((v) => v.steps.some((s) => s.id === stepId)),
  );
}

export function visitOf(
  guide: GuideFile,
  stepId: string | null,
): Visit | undefined {
  if (stepId === null) return undefined;
  for (const chapter of guide.chapters) {
    const visit = chapter.visits.find((v) =>
      v.steps.some((s) => s.id === stepId),
    );
    if (visit) return visit;
  }
  return undefined;
}
