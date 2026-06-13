import type { GuideFile, RaMapping } from "../schema";
import { widgetItemIds } from "../schema";
import {
  type ContentIndex,
  type FlaggedRow,
  indexRow,
  raRow,
} from "./flaggedRows";
import type { LayerReport } from "./layerRoster";

// How many rows a single "spot-check" draws by default (§7 S5 "spot-check N").
export const DEFAULT_SAMPLE = 5;

// The checkable item IDs a spine or widget layer owns, read straight from the
// assembled guide. A widget layer "widget-<seg>" maps to the widget whose id
// is "<slug>:<seg>" (the assembly convention, verified across guides).
function layerAllItemIds(layer: LayerReport, guide: GuideFile): string[] {
  if (layer.kind === "spine") {
    return guide.chapters.flatMap((c) => c.steps.map((s) => s.id));
  }
  if (layer.kind === "widget") {
    const widgetId = `${guide.guideId}:${layer.id.slice("widget-".length)}`;
    const widget = guide.widgets.find((w) => w.id === widgetId);
    return widget ? widgetItemIds(widget) : [];
  }
  return [];
}

// The pool a spot-check samples: the layer's checkable rows the compiler was
// confident about — its flagged rows are reviewed separately (Task 2), so they
// are excluded here.
export function layerUnflaggedRows(
  layer: LayerReport,
  index: ContentIndex,
  guide: GuideFile,
  raMapping: RaMapping | null,
): FlaggedRow[] {
  const flagged = new Set(layer.flaggedItemIds);
  if (layer.kind === "ra-mapping") {
    return (raMapping?.entries ?? [])
      .filter((entry) => !flagged.has(entry.targetItemId))
      .map((entry) => raRow(entry, index));
  }
  return layerAllItemIds(layer, guide)
    .filter((id) => !flagged.has(id))
    .map((id) => indexRow(id, index))
    .filter((row): row is FlaggedRow => row !== undefined);
}

// Up to N distinct random rows. The rng is injectable so tests are
// deterministic; a partial Fisher–Yates avoids copying the whole pool when N is
// small relative to it.
export function sampleRows(
  rows: FlaggedRow[],
  n: number,
  rng: () => number = Math.random,
): FlaggedRow[] {
  const pool = [...rows];
  const take = Math.min(n, pool.length);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j] as FlaggedRow, pool[i] as FlaggedRow];
  }
  return pool.slice(0, take);
}
