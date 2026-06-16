import type { GuideFile, RaMapping, Widget } from "../schema";

// One leftover task in the cleanup view (FR-B4): a non-done step or widget
// item. Counters carry their progress; everything binary is tappable to done.
export type CleanupItem = {
  itemId: string;
  label: string;
  kind: "step" | "item" | "counter";
  skipped: boolean;
  counter?: { value: number; target: number };
};

export type CleanupGroup = { label: string; items: CleanupItem[] };

export type CleanupProgress = {
  doneIds: ReadonlySet<string>;
  skippedIds: ReadonlySet<string>;
  counterValues: Readonly<Record<string, number>>;
};

// Non-done checkable items a widget exposes, with a label derived per primitive
// (matrix/dataTable items have no label of their own). dataTable rows count only
// when `checkable`; a counter is done once it reaches its target.
function widgetCleanupItems(
  widget: Widget,
  progress: CleanupProgress,
): CleanupItem[] {
  const items: CleanupItem[] = [];
  const binary = (itemId: string, label: string) => {
    if (!progress.doneIds.has(itemId)) {
      items.push({
        itemId,
        label,
        kind: "item",
        skipped: progress.skippedIds.has(itemId),
      });
    }
  };

  switch (widget.type) {
    case "checklist":
      for (const row of widget.rows) binary(row.itemId, row.label);
      break;
    case "flowchart":
      for (const node of widget.nodes) binary(node.itemId, node.label);
      break;
    case "mapPins":
      for (const pin of widget.pins) binary(pin.itemId, pin.label);
      break;
    case "prepCard":
      for (const item of widget.items) binary(item.itemId, item.label);
      break;
    case "matrix": {
      const rowLabel = new Map(widget.rows.map((r) => [r.id, r.label]));
      const colLabel = new Map(widget.columns.map((c) => [c.id, c.label]));
      for (const cell of widget.cells) {
        binary(
          cell.itemId,
          `${rowLabel.get(cell.rowId) ?? cell.rowId} × ${colLabel.get(cell.columnId) ?? cell.columnId}`,
        );
      }
      break;
    }
    case "dataTable": {
      const colLabel = new Map(widget.columns.map((c) => [c.id, c.label]));
      for (const row of widget.rows) {
        if (!row.checkable) continue;
        const cells = Object.entries(row.cells)
          .map(([col, val]) => `${colLabel.get(col) ?? col}: ${val}`)
          .join(" · ");
        binary(row.itemId, cells);
      }
      break;
    }
    case "counter":
      for (const counter of widget.counters) {
        const value = progress.counterValues[counter.itemId] ?? 0;
        if (value >= counter.target) continue;
        items.push({
          itemId: counter.itemId,
          label: counter.label,
          kind: "counter",
          skipped: false,
          counter: { value, target: counter.target },
        });
      }
      break;
  }
  return items;
}

// Every non-done task, grouped (P7): steps by location in chapter order, then
// each widget's items under its title in deck order. Skipped steps surface here
// as leftovers (skip ≠ done) — flagged by the caller.
export function collectCleanupTasks(
  guide: GuideFile,
  progress: CleanupProgress,
): CleanupGroup[] {
  const order: string[] = [];
  const byLabel = new Map<string, CleanupItem[]>();
  const push = (label: string, item: CleanupItem) => {
    const bucket = byLabel.get(label);
    if (bucket) {
      bucket.push(item);
    } else {
      order.push(label);
      byLabel.set(label, [item]);
    }
  };

  const locationName = new Map(guide.locations.map((l) => [l.id, l.name]));
  for (const chapter of guide.chapters) {
    for (const visit of chapter.visits) {
      const place = locationName.get(visit.locationId) ?? chapter.title;
      for (const step of visit.steps) {
        if (progress.doneIds.has(step.id)) continue;
        push(place, {
          itemId: step.id,
          label: step.keywords.join(" · "),
          kind: "step",
          skipped: progress.skippedIds.has(step.id),
        });
      }
    }
  }

  for (const widget of [...guide.widgets].sort(
    (a, b) => a.deckPosition - b.deckPosition,
  )) {
    for (const item of widgetCleanupItems(widget, progress)) {
      push(widget.title, item);
    }
  }

  return order.map((label) => ({ label, items: byLabel.get(label) ?? [] }));
}

// Mastery proxy (§7 S4): an achievement counts as earned when its mapped target
// is done — exactly what Sync reconciles, so this needs no stored RA state.
// Null when the guide has no RA set.
export function mastery(
  raMapping: RaMapping | null,
  doneIds: ReadonlySet<string>,
): { earned: number; total: number } | null {
  if (!raMapping || raMapping.entries.length === 0) return null;
  const earned = raMapping.entries.filter((e) =>
    doneIds.has(e.targetItemId),
  ).length;
  return { earned, total: raMapping.entries.length };
}
