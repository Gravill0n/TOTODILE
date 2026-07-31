import { createHash } from "node:crypto";

// One-shot migration for `location.mapImage` → `location.mapImages[]`
// (2026-07-31). Two jobs, kept apart on purpose:
//
//   1. SHAPE — every location's single map becomes a one-entry list.
//   2. DATA  — a location also adopts the images of the mapPins widgets scoped
//      to it. Those images are already bound to the place by an approved
//      widget layer's `scope`, and they are the only maps the guides hold for
//      a location's other floors: Ice Path's three, Tin Tower's nine. Without
//      this the new list would be a list of one everywhere and the panel would
//      have nothing to switch between. Nothing is invented — an adopted map is
//      an asset the guide already ships and already shows on that page.
//
// Only Crystal is affected by (2): Celeste and Ocarina of Time already point
// each pin widget at its location's own map.

export type ImageRefLike = {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
};

type LegacyLocation = {
  id: string;
  name: string;
  mapImage?: ImageRefLike;
  mapImages?: ImageRefLike[];
};

type PinWidgetLike = {
  type: string;
  image?: ImageRefLike;
  scope: { kind: string; locationId?: string };
};

export type MigrationCounts = {
  locations: number;
  shapeConverted: number;
  adopted: number;
  multiMap: number;
};

// The maps a location ends up with: its own first (it stays what the panel
// opens on), then each distinct pin-widget image in widget order.
export function locationMaps(
  location: LegacyLocation,
  widgets: readonly PinWidgetLike[],
): ImageRefLike[] {
  const maps: ImageRefLike[] = [
    ...(location.mapImages ?? []),
    ...(location.mapImage ? [location.mapImage] : []),
  ];
  const seen = new Set(maps.map((image) => image.src));
  for (const widget of widgets) {
    if (widget.type !== "mapPins" || widget.scope.kind !== "location") continue;
    if (widget.scope.locationId !== location.id) continue;
    const image = widget.image;
    if (!image || seen.has(image.src)) continue;
    seen.add(image.src);
    maps.push(image);
  }
  return maps;
}

// Rewrites `locations[]` in place on a parsed guide.json or layers/spine.json
// body. `widgets` is empty for a spine layer — it holds no widgets, so a spine
// migration is shape-only and the widget images arrive when the same guide's
// guide.json is migrated beside it.
export function migrateLocations(
  body: { locations?: LegacyLocation[]; widgets?: PinWidgetLike[] },
  widgets: readonly PinWidgetLike[] = body.widgets ?? [],
): MigrationCounts {
  const counts: MigrationCounts = {
    locations: 0,
    shapeConverted: 0,
    adopted: 0,
    multiMap: 0,
  };
  for (const location of body.locations ?? []) {
    counts.locations += 1;
    const own = location.mapImage ? 1 : (location.mapImages?.length ?? 0);
    const maps = locationMaps(location, widgets);
    if (location.mapImage) counts.shapeConverted += 1;
    counts.adopted += Math.max(0, maps.length - own);
    if (maps.length > 1) counts.multiMap += 1;
    delete location.mapImage;
    location.mapImages = maps;
  }
  return counts;
}

export function sha256(contents: string | Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

// The staleness contract (COMPILER_PASS_CONTRACT §6) compares a byte digest of
// every input a pass recorded. This migration changes the bytes of two files
// every downstream pass names — layers/spine.json and guide.json — without
// changing anything those passes read from them: no id, no step, no widget
// row. Left alone, ~420 reports across three guides would read stale and
// `yarn assemble-guide` would refuse until every widget pass was re-run.
//
// So the recorded digest for THOSE TWO FILES ONLY is refreshed, and each
// touched report says so in `notes[]`. Every other recorded input keeps its
// digest, so a genuinely stale layer is still caught.
export const REFRESHED_INPUTS = ["layers/spine.json", "guide.json"];

export const MIGRATION_NOTE =
  "Input digest for layers/spine.json / guide.json refreshed by the " +
  "location.mapImage → mapImages[] migration (2026-07-31): a shape change " +
  "only — no id, step, row or image this pass read was altered.";

export type ReportBody = {
  inputs?: { file: string; sha256: string }[];
  notes?: string[];
};

// Returns true when the report was changed (so the runner only rewrites what
// it must, and re-running the migration is a no-op).
export function refreshReportInputs(
  report: ReportBody,
  digestOf: (file: string) => string | null,
  note: string = MIGRATION_NOTE,
): boolean {
  let changed = false;
  for (const input of report.inputs ?? []) {
    if (!REFRESHED_INPUTS.includes(input.file)) continue;
    const digest = digestOf(input.file);
    if (digest === null || digest === input.sha256) continue;
    input.sha256 = digest;
    changed = true;
  }
  if (changed && !report.notes?.includes(note)) {
    report.notes = [...(report.notes ?? []), note];
  }
  return changed;
}
