import type { LibraryEntry, ProgressSlot } from "@/schema";
import type { SortKey } from "./LibraryToolbar";

// The pure half of the library toolbar: what matches, and in what order. Kept
// out of the screen so the orderings can be reasoned about (and tested) as
// data, not as rendered headings.

export function completionOf(slot: ProgressSlot | undefined): number | null {
  const stats = slot?.stats;
  return stats && stats.stepsTotal > 0
    ? Math.round((stats.stepsDone / stats.stepsTotal) * 100)
    : null;
}

// Case-insensitive substring over the three things a player would type: the
// guide's own title, the game, and the platform it is on.
export function matchesSearch(entry: LibraryEntry, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (needle === "") return true;
  return [entry.title, entry.game, entry.platform].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

export function sortEntries(
  entries: LibraryEntry[],
  sort: SortKey,
  slotOf: (id: string) => ProgressSlot | undefined,
): LibraryEntry[] {
  const byTitle = (a: LibraryEntry, b: LibraryEntry) =>
    a.title.localeCompare(b.title);
  return [...entries].sort((a, b) => {
    if (sort === "title") return byTitle(a, b);
    if (sort === "completion") {
      // Furthest along first; guides never opened have nothing to compare and
      // fall to the end.
      const doneA = completionOf(slotOf(a.id));
      const doneB = completionOf(slotOf(b.id));
      if (doneA !== null && doneB !== null && doneA !== doneB) {
        return doneB - doneA;
      }
      if (doneA !== null && doneB === null) return -1;
      if (doneA === null && doneB !== null) return 1;
      return byTitle(a, b);
    }
    // FR-A3 ordering, unchanged: most recently played first, guides with no
    // slot last, ties broken alphabetically.
    const lastA = slotOf(a.id)?.lastActivityAt;
    const lastB = slotOf(b.id)?.lastActivityAt;
    if (lastA && lastB) return lastB.localeCompare(lastA);
    if (lastA) return -1;
    if (lastB) return 1;
    return byTitle(a, b);
  });
}
