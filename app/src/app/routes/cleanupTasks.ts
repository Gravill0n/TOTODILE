import { widgetBinaryItems } from "@/lib/widgetItems";
import {
  counterTarget,
  type GuideFile,
  type RaMapping,
  type Widget,
} from "@/schema";

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
  if (widget.type === "counter") {
    const items: CleanupItem[] = [];
    for (const counter of widget.counters) {
      const target = counterTarget(counter);
      // Derived entries (#5) count their checked derivedFrom ids; manual
      // entries read the stored value.
      const value = counter.derivedFrom
        ? counter.derivedFrom.filter((id) => progress.doneIds.has(id)).length
        : (progress.counterValues[counter.itemId] ?? 0);
      if (value >= target) continue;
      items.push({
        itemId: counter.itemId,
        label: counter.label,
        kind: "counter",
        skipped: false,
        counter: { value, target },
      });
    }
    return items;
  }

  // Binary items and their labels come from the shared enumerator; only
  // checkable ones are tasks (dataTable rows may be informational-only).
  return widgetBinaryItems(widget)
    .filter((item) => item.checkable && !progress.doneIds.has(item.itemId))
    .map((item) => ({
      itemId: item.itemId,
      label: item.label,
      kind: "item" as const,
      skipped: progress.skippedIds.has(item.itemId),
    }));
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
