import type { GuideFile, Location, Step, Visit, Widget } from "@/schema";

// The derived location index (§8 / Workstream A): everything a place gathers
// across the whole route. For each location it aggregates every visit to it
// (in spine order, so revisits sit together), all those visits' steps, the
// widgets scoped to the location (shown on every visit there, e.g. an encounter
// table), and the RA achievements earnable across its steps. Powers the
// place-first screen (#8) and the achievements view. Pure derivation — nothing
// stored.
export type LocationIndexEntry = {
  location: Location;
  visits: Visit[];
  steps: Step[];
  widgets: Widget[];
  achievementRefs: number[];
};

export function buildLocationIndex(
  guide: GuideFile,
): Map<string, LocationIndexEntry> {
  // Chapter then visit array order is spine order, so a location's visits come
  // out in the order the route reaches them.
  const allVisits = guide.chapters.flatMap((chapter) => chapter.visits);
  const locationWidgets = [...guide.widgets]
    .filter((widget) => widget.scope.kind === "location")
    .sort((a, b) => a.deckPosition - b.deckPosition);

  const index = new Map<string, LocationIndexEntry>();
  for (const location of guide.locations) {
    const visits = allVisits.filter((v) => v.locationId === location.id);
    const steps = visits.flatMap((v) => v.steps);
    const widgets = locationWidgets.filter(
      (w) => w.scope.kind === "location" && w.scope.locationId === location.id,
    );
    const achievementRefs = [
      ...new Set(steps.flatMap((s) => s.achievementRefs)),
    ];
    index.set(location.id, {
      location,
      visits,
      steps,
      widgets,
      achievementRefs,
    });
  }
  return index;
}
