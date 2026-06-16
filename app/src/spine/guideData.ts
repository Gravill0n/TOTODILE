import type { Chapter, GuideFile, Step, Visit } from "../schema";
import { guideFile } from "../schema";

// Same contract as the library loader: relative URLs work in dev (vite
// middleware) and beside dist/ in production (§21.3); malformed data throws
// into the route's visible broken state (§11.1).
export async function loadGuide(slug: string): Promise<GuideFile> {
  const response = await fetch(`guides/${slug}/guide.json`);
  if (!response.ok) {
    throw new Error(`Could not load guide "${slug}" (HTTP ${response.status})`);
  }
  return guideFile.parse(await response.json());
}

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
