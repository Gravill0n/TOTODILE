import { chapterOf, visitOf } from "@/lib/guide";
import type { GuideFile, WidgetScope } from "@/schema";

// Where the pointer currently is, as the three IDs a widget scope can bind to
// (Workstream A). Derived from the current step; all undefined before play.
export type WidgetContext = {
  chapterId: string | undefined;
  locationId: string | undefined;
  visitId: string | undefined;
};

export function widgetContextFor(
  guide: GuideFile,
  currentStepId: string | null,
): WidgetContext {
  const visit = visitOf(guide, currentStepId);
  return {
    chapterId: chapterOf(guide, currentStepId)?.id,
    locationId: visit?.locationId,
    visitId: visit?.id,
  };
}

// Is a widget in scope for where the pointer is (FR-A5)? Global always; chapter
// matches the current chapter; **location** matches the current step's visit's
// location — so a location-scoped widget shows on *every* visit to that place;
// **visit** matches only the current visit. The whole-game toggle lifts the
// filter upstream; this is the per-scope predicate it bypasses.
export function widgetInScope(
  scope: WidgetScope,
  context: WidgetContext,
): boolean {
  switch (scope.kind) {
    case "global":
      return true;
    case "chapter":
      return scope.chapterId === context.chapterId;
    case "location":
      return scope.locationId === context.locationId;
    case "visit":
      return scope.visitId === context.visitId;
  }
}
