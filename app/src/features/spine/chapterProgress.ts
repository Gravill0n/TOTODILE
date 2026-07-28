import type { GuideFile } from "@/schema";

// Derived views of the chapter → visit → step tree that design v2 needs and the
// old whole-spine scroll never did: per-chapter completion for the rail, and a
// flat visit walk for the URL-addressable visit page. Pure derivation over the
// guide plus the done set — nothing stored, nothing fetched.
//
// A location can be reached more than once, so a VISIT is the unit here, never
// its place: the cave visited in chapter 1 and again in chapter 6 are two
// entries with their own counts and their own URLs.

export type VisitRef = {
  visitId: string;
  chapterId: string;
  chapterTitle: string;
  locationId: string;
  locationName: string;
  stepIds: string[];
  // 1-based position among the visits to THIS location, and how many there are
  // in total — the breadcrumb's "Visit 1 of 3".
  ordinalAtLocation: number;
  visitsAtLocation: number;
  previousVisitId: string | null;
  nextVisitId: string | null;
};

export type VisitProgress = {
  visitId: string;
  locationId: string;
  locationName: string;
  done: number;
  total: number;
};

export type ChapterProgress = {
  chapterId: string;
  title: string;
  done: number;
  total: number;
  visits: VisitProgress[];
};

function locationNames(guide: GuideFile): Map<string, string> {
  return new Map(
    guide.locations.map((location) => [location.id, location.name]),
  );
}

export function chapterProgress(
  guide: GuideFile,
  doneIds: ReadonlySet<string>,
): ChapterProgress[] {
  const names = locationNames(guide);
  return guide.chapters.map((chapter) => {
    const visits = chapter.visits.map((visit) => ({
      visitId: visit.id,
      locationId: visit.locationId,
      locationName: names.get(visit.locationId) ?? visit.locationId,
      done: visit.steps.filter((step) => doneIds.has(step.id)).length,
      total: visit.steps.length,
    }));
    return {
      chapterId: chapter.id,
      title: chapter.title,
      done: visits.reduce((sum, visit) => sum + visit.done, 0),
      total: visits.reduce((sum, visit) => sum + visit.total, 0),
      visits,
    };
  });
}

// Chapter then visit array order is spine order (lib/guide.ts), so this walk is
// the route itself — prev/next cross chapter boundaries the way the player does.
export function visitIndex(guide: GuideFile): VisitRef[] {
  const names = locationNames(guide);
  const flat = guide.chapters.flatMap((chapter) =>
    chapter.visits.map((visit) => ({ chapter, visit })),
  );
  const seenAtLocation = new Map<string, number>();
  const totalAtLocation = new Map<string, number>();
  for (const { visit } of flat) {
    totalAtLocation.set(
      visit.locationId,
      (totalAtLocation.get(visit.locationId) ?? 0) + 1,
    );
  }

  return flat.map(({ chapter, visit }, position) => {
    const ordinal = (seenAtLocation.get(visit.locationId) ?? 0) + 1;
    seenAtLocation.set(visit.locationId, ordinal);
    return {
      visitId: visit.id,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      locationId: visit.locationId,
      locationName: names.get(visit.locationId) ?? visit.locationId,
      stepIds: visit.steps.map((step) => step.id),
      ordinalAtLocation: ordinal,
      visitsAtLocation: totalAtLocation.get(visit.locationId) ?? 1,
      previousVisitId: flat[position - 1]?.visit.id ?? null,
      nextVisitId: flat[position + 1]?.visit.id ?? null,
    };
  });
}

export function visitOfStep(
  guide: GuideFile,
  stepId: string | null,
): VisitRef | undefined {
  if (stepId === null) return undefined;
  return visitIndex(guide).find((visit) => visit.stepIds.includes(stepId));
}
