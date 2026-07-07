import type { GenreDeck, GuideFile, WidgetScope } from "../schema";
import type { LayerReport } from "./layerRoster";

// One review card per deck slot (§15 risk 2 — editor fatigue): the ~318
// same-slot/different-scope widget layers Crystal compiles collapse into 9
// groups. Grouping is UI-level only — approvals.json still carries one
// hash-locked record per member layer.
export type SlotGroup = {
  // Stable React key: "slot-<n>", or "layer-<id>" for a meta-less singleton.
  key: string;
  // Null when the layer carried no widget metadata (pre-manifest drift) —
  // such a layer becomes its own group rather than being dropped.
  deckPosition: number | null;
  title: string;
  layers: LayerReport[];
};

// Same bucketing discipline as spine/locationIndex.ts: sort by deckPosition,
// group, member order alphabetical (the roster's widget order).
export function buildSlotGroups(
  widgets: LayerReport[],
  deck: GenreDeck | null,
): SlotGroup[] {
  const bySlot = new Map<number, LayerReport[]>();
  const orphans: LayerReport[] = [];
  for (const layer of widgets) {
    if (layer.widget === undefined) {
      orphans.push(layer);
      continue;
    }
    const members = bySlot.get(layer.widget.deckPosition) ?? [];
    members.push(layer);
    bySlot.set(layer.widget.deckPosition, members);
  }

  const groups: SlotGroup[] = [...bySlot.entries()]
    .sort(([a], [b]) => a - b)
    .map(([deckPosition, layers]) => ({
      key: `slot-${deckPosition}`,
      deckPosition,
      title:
        deck?.slots[deckPosition]?.defaultTitle ??
        layers[0]?.widget?.title ??
        `slot ${deckPosition}`,
      layers: layers.sort((a, b) => a.id.localeCompare(b.id)),
    }));

  return [
    ...groups,
    ...orphans
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((layer) => ({
        key: `layer-${layer.id}`,
        deckPosition: null,
        title: layer.id,
        layers: [layer],
      })),
  ];
}

// Human name for a member's scope inside a slot card — where this instance
// of the slot lives. Falls back to the ID's local segment when the guide
// (possibly null mid-pipeline) cannot resolve it.
export function scopeLabel(
  scope: WidgetScope,
  guide: GuideFile | null,
): string {
  const segment = (id: string) => id.split(":")[1] ?? id;
  switch (scope.kind) {
    case "global":
      return "global";
    case "chapter":
      return (
        guide?.chapters.find((c) => c.id === scope.chapterId)?.title ??
        segment(scope.chapterId)
      );
    case "location":
      return (
        guide?.locations.find((l) => l.id === scope.locationId)?.name ??
        segment(scope.locationId)
      );
    case "visit":
      return segment(scope.visitId);
  }
}
