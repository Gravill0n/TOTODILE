import type { Widget } from "@/schema";

// How the stack is arranged: the order the player dragged things into, with
// pinned widgets lifted to the top. Pure, so the arrangement can be reasoned
// about as a list rather than as a rendered column.

// Widgets the player has never moved fall back to `deckPosition` (§6.4 deck
// order) and sit after the ones they have. That is what makes a recompile
// safe: a guide that gains a widget appends it instead of discarding an
// arrangement that no longer mentions every id.
export function arrangeWidgets(
  widgets: readonly Widget[],
  order: readonly string[],
  pinned: readonly string[],
): Widget[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  const byArrangement = [...widgets].sort((a, b) => {
    const rankA = rank.get(a.id);
    const rankB = rank.get(b.id);
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    return a.deckPosition - b.deckPosition;
  });
  const isPinned = (widget: Widget) => pinned.includes(widget.id);
  return [
    ...byArrangement.filter(isPinned),
    ...byArrangement.filter((widget) => !isPinned(widget)),
  ];
}

// Swap a widget with its neighbour, returning the new full order. Movement
// stops at the pinned/unpinned boundary: dragging a card out of the pinned
// group would silently unpin it, and a pin is a decision the player made
// explicitly — it should take an explicit press to undo.
export function moveWidget(
  arranged: readonly Widget[],
  widgetId: string,
  delta: -1 | 1,
  pinned: readonly string[],
): string[] {
  const ids = arranged.map((widget) => widget.id);
  const from = ids.indexOf(widgetId);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return ids;
  const neighbour = ids[to];
  if (neighbour === undefined) return ids;
  if (pinned.includes(widgetId) !== pinned.includes(neighbour)) return ids;
  const next = [...ids];
  next[from] = neighbour;
  next[to] = widgetId;
  return next;
}

// Can this widget move that way at all? The buttons ask before rendering
// themselves enabled, so a disabled arrow and a refused move agree.
export function canMove(
  arranged: readonly Widget[],
  widgetId: string,
  delta: -1 | 1,
  pinned: readonly string[],
): boolean {
  return (
    moveWidget(arranged, widgetId, delta, pinned).join() !==
    arranged.map((widget) => widget.id).join()
  );
}
