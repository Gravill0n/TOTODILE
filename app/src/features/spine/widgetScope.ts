import type { GuideFile, WidgetScope } from "@/schema";

// Where the reader is, as the three IDs a widget scope can bind to
// (Workstream A). Derived from the visit the URL names — the page in front of
// them — not from where their pointer sits: browsing three visits ahead to
// plan a detour should bring that place's tables with it, and it used to leave
// the rail showing the room they had walked away from. All undefined when
// there is no visit on screen.
export type WidgetContext = {
  chapterId: string | undefined;
  locationId: string | undefined;
  visitId: string | undefined;
};

export function widgetContextFor(
  guide: GuideFile,
  visitId: string | null,
): WidgetContext {
  const chapter =
    visitId === null
      ? undefined
      : guide.chapters.find((c) => c.visits.some((v) => v.id === visitId));
  const visit = chapter?.visits.find((v) => v.id === visitId);
  return {
    chapterId: chapter?.id,
    locationId: visit?.locationId,
    visitId: visit?.id,
  };
}

// Is a widget in scope for the displayed place (FR-A5)? Global always; chapter
// matches the displayed chapter; **location** matches the displayed visit's
// location — so a location-scoped widget shows on *every* visit to that place;
// **visit** matches only that visit. The whole-game toggle lifts the filter
// upstream; this is the per-scope predicate it bypasses.
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
