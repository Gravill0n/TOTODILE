import type { Confidence, GuideFile, RaMapping, Widget } from "../schema";
import type { LayerReport } from "./layerRoster";

// A flagged row, normalised across spine steps, widget items, and RA-mapping
// entries, ready to render beside its source(s) (FR-E2/E3).
export type FlaggedRow = {
  id: string;
  title: string;
  detail?: string;
  sourceRefs: string[];
  confidence: Confidence;
};

type RowContent = {
  title: string;
  detail?: string;
  sourceRefs: string[];
  confidence: Confidence;
};

function joinDetail(parts: (string | undefined)[]): string | undefined {
  const kept = parts.filter((part): part is string => Boolean(part));
  return kept.length > 0 ? kept.join(" · ") : undefined;
}

// One row per checkable item a widget exposes, with a human label derived per
// primitive — matrix/dataTable items have no label of their own, so they are
// built from the axes / cell values.
function widgetRowContents(value: Widget): Map<string, RowContent> {
  const rows = new Map<string, RowContent>();
  const add = (itemId: string, content: RowContent) =>
    rows.set(itemId, content);
  const withWidget = (detail?: string) => joinDetail([value.title, detail]);

  switch (value.type) {
    case "checklist":
      for (const row of value.rows) {
        add(row.itemId, {
          title: row.label,
          detail: withWidget(row.note),
          sourceRefs: row.sourceRefs,
          confidence: row.confidence,
        });
      }
      break;
    case "counter":
      for (const counter of value.counters) {
        add(counter.itemId, {
          title: counter.label,
          detail: withWidget(`target ${counter.target}`),
          sourceRefs: counter.sourceRefs,
          confidence: counter.confidence,
        });
      }
      break;
    case "flowchart":
      for (const node of value.nodes) {
        add(node.itemId, {
          title: node.label,
          detail: withWidget(node.note),
          sourceRefs: node.sourceRefs,
          confidence: node.confidence,
        });
      }
      break;
    case "mapPins":
      for (const pin of value.pins) {
        add(pin.itemId, {
          title: pin.label,
          detail: withWidget(undefined),
          sourceRefs: pin.sourceRefs,
          confidence: pin.confidence,
        });
      }
      break;
    case "prepCard":
      for (const item of value.items) {
        add(item.itemId, {
          title: item.label,
          detail: withWidget(
            joinDetail([
              item.quantity ? `×${item.quantity}` : undefined,
              item.note,
            ]),
          ),
          sourceRefs: item.sourceRefs,
          confidence: item.confidence,
        });
      }
      break;
    case "matrix": {
      const rowLabel = new Map(value.rows.map((r) => [r.id, r.label]));
      const colLabel = new Map(value.columns.map((c) => [c.id, c.label]));
      for (const cell of value.cells) {
        add(cell.itemId, {
          title: `${rowLabel.get(cell.rowId) ?? cell.rowId} × ${colLabel.get(cell.columnId) ?? cell.columnId}`,
          detail: withWidget(undefined),
          sourceRefs: cell.sourceRefs,
          confidence: cell.confidence,
        });
      }
      break;
    }
    case "dataTable": {
      const colLabel = new Map(value.columns.map((c) => [c.id, c.label]));
      for (const row of value.rows) {
        const cells = Object.entries(row.cells)
          .map(([col, val]) => `${colLabel.get(col) ?? col}: ${val}`)
          .join(" · ");
        add(row.itemId, {
          title: cells,
          detail: withWidget(undefined),
          sourceRefs: row.sourceRefs,
          confidence: row.confidence,
        });
      }
      break;
    }
  }
  return rows;
}

// itemId → content, over every step and every widget checkable in the
// assembled guide. The flagged IDs in each layer report key into this (the
// checkable namespace is unique per guide, §6.5), and RA-mapping rows resolve
// their target's title through it too.
export function buildContentIndex(guide: GuideFile): Map<string, RowContent> {
  const index = new Map<string, RowContent>();
  for (const chapter of guide.chapters) {
    for (const step of chapter.steps) {
      index.set(step.id, {
        title: step.text,
        detail: joinDetail([chapter.title, step.section, step.location]),
        sourceRefs: step.sourceRefs,
        confidence: step.confidence,
      });
    }
  }
  for (const widget of guide.widgets) {
    for (const [itemId, content] of widgetRowContents(widget)) {
      index.set(itemId, content);
    }
  }
  return index;
}

// The flagged rows for one layer. spine/widget layers map their flagged item
// IDs straight through the content index; the ra-mapping layer turns each
// flagged target into one row per achievement that lands on it (several may),
// labelled "RA #<id> → <target>".
export function resolveFlaggedRows(
  layer: LayerReport,
  index: Map<string, RowContent>,
  raMapping: RaMapping | null,
): FlaggedRow[] {
  if (layer.kind === "ra-mapping") {
    const flagged = new Set(layer.flaggedItemIds);
    const entries = (raMapping?.entries ?? []).filter((entry) =>
      flagged.has(entry.targetItemId),
    );
    return entries.map((entry) => {
      const target = index.get(entry.targetItemId);
      return {
        id: `${entry.raAchievementId}:${entry.targetItemId}`,
        title: `RA #${entry.raAchievementId} → ${target?.title ?? entry.targetItemId}`,
        detail: target?.detail,
        sourceRefs: entry.sourceRefs,
        confidence: entry.confidence,
      };
    });
  }

  return layer.flaggedItemIds.map((id) => {
    const content = index.get(id);
    if (!content) {
      // A flagged ID with no row in the assembled guide is itself a finding
      // worth surfacing, never a silent drop.
      return {
        id,
        title: id,
        detail: "(no matching row in the assembled guide)",
        sourceRefs: [],
        confidence: "flagged" as const,
      };
    }
    return { id, ...content };
  });
}
