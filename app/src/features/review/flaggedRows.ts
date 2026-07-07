import { joinDetail, widgetBinaryItems } from "@/lib/widgetItems";
import type {
  Confidence,
  GuideFile,
  RaMapping,
  RaMappingEntry,
  Widget,
} from "@/schema";
import type { LayerReport } from "./layerRoster";

// A flagged row, normalised across spine steps, widget items, and RA-mapping
// entries, ready to render beside its source(s) (FR-E2/E3).
export type FlaggedRow = {
  // Display key — unique per rendered row. For ra-mapping rows this combines
  // the achievement and its target; elsewhere it equals itemId.
  id: string;
  // The checkable a verdict keys on (spotCheckVerdict.itemId) — the step /
  // widget item, or an ra-mapping row's target.
  itemId: string;
  title: string;
  detail?: string;
  sourceRefs: string[];
  confidence: Confidence;
  // ra-mapping rows only: the target row passed review in its own layer, so
  // only the mapping itself is in question (T6 — the flag-dedupe payoff).
  targetApproved?: boolean;
};

export type RowContent = {
  title: string;
  detail?: string;
  sourceRefs: string[];
  confidence: Confidence;
};

export type ContentIndex = Map<string, RowContent>;

// Build a renderable row for a checkable item, or undefined if the assembled
// guide has no such row. Shared by the flagged worklist and the spot-check
// sampler so both render identically.
export function indexRow(
  itemId: string,
  index: ContentIndex,
): FlaggedRow | undefined {
  const content = index.get(itemId);
  return content ? { id: itemId, itemId, ...content } : undefined;
}

// One row per checkable item a widget exposes; labels come from the shared
// enumerator (lib/widgetItems). Counters stay local: the review lens shows
// their target as detail, which is this lens's concern, not the enumerator's.
function widgetRowContents(value: Widget): Map<string, RowContent> {
  const rows = new Map<string, RowContent>();
  const withWidget = (detail?: string) => joinDetail([value.title, detail]);

  if (value.type === "counter") {
    for (const counter of value.counters) {
      rows.set(counter.itemId, {
        title: counter.label,
        detail: withWidget(`target ${counter.target}`),
        sourceRefs: counter.sourceRefs,
        confidence: counter.confidence,
      });
    }
    return rows;
  }

  for (const item of widgetBinaryItems(value)) {
    rows.set(item.itemId, {
      title: item.label,
      detail: withWidget(item.note),
      sourceRefs: item.sourceRefs,
      confidence: item.confidence,
    });
  }
  return rows;
}

// itemId → content, over every step and every widget checkable in the
// assembled guide. The flagged IDs in each layer report key into this (the
// checkable namespace is unique per guide, §6.5), and RA-mapping rows resolve
// their target's title through it too.
export function buildContentIndex(guide: GuideFile): Map<string, RowContent> {
  const index = new Map<string, RowContent>();
  const locationName = new Map(guide.locations.map((l) => [l.id, l.name]));
  for (const chapter of guide.chapters) {
    for (const visit of chapter.visits) {
      const place = locationName.get(visit.locationId);
      for (const step of visit.steps) {
        index.set(step.id, {
          title: step.keywords.join(" · "),
          detail: joinDetail([chapter.title, place, step.detail]),
          sourceRefs: step.sourceRefs,
          confidence: step.confidence,
        });
      }
    }
  }
  for (const widget of guide.widgets) {
    for (const [itemId, content] of widgetRowContents(widget)) {
      index.set(itemId, content);
    }
  }
  return index;
}

// One ra-mapping row: the achievement and the target it lands on, the target's
// content pulled through the index. Shared by the flagged worklist and the
// spot-check sampler.
export function raRow(entry: RaMappingEntry, index: ContentIndex): FlaggedRow {
  const target = index.get(entry.targetItemId);
  return {
    id: `${entry.raAchievementId}:${entry.targetItemId}`,
    itemId: entry.targetItemId,
    title: `RA #${entry.raAchievementId} → ${target?.title ?? entry.targetItemId}`,
    detail: target?.detail,
    sourceRefs: entry.sourceRefs,
    confidence: entry.confidence,
  };
}

// The flagged rows for one layer. spine/widget layers map their flagged item
// IDs straight through the content index; the ra-mapping layer turns each
// flagged target into one row per achievement that lands on it (several may),
// labelled "RA #<id> → <target>".
export function resolveFlaggedRows(
  layer: LayerReport,
  index: ContentIndex,
  raMapping: RaMapping | null,
  // ra-mapping only: whether a target's owning layer is already approved —
  // such rows get the "target already approved" marker.
  isTargetApproved?: (itemId: string) => boolean,
): FlaggedRow[] {
  if (layer.kind === "ra-mapping") {
    const flagged = new Set(layer.flaggedItemIds);
    return (raMapping?.entries ?? [])
      .filter((entry) => flagged.has(entry.targetItemId))
      .map((entry) => ({
        ...raRow(entry, index),
        ...(isTargetApproved?.(entry.targetItemId)
          ? { targetApproved: true }
          : {}),
      }));
  }

  return layer.flaggedItemIds.map((id) => {
    const content = index.get(id);
    if (!content) {
      // A flagged ID with no row in the assembled guide is itself a finding
      // worth surfacing, never a silent drop.
      return {
        id,
        itemId: id,
        title: id,
        detail: "(no matching row in the assembled guide)",
        sourceRefs: [],
        confidence: "flagged" as const,
      };
    }
    return { id, itemId: id, ...content };
  });
}
