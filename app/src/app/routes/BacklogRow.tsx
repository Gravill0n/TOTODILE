import { Badge } from "@/components/ui/badge";
import type { LibraryEntry } from "@/schema";

// A backlog entry (#7) is a manifest row with no compiled content behind it:
// nothing to open, nothing to be part-way through. It gets a dense line rather
// than a card — the backlog is a list of intentions, and eight of them should
// read as one block, not eight equals of the guides you can actually play.
export function BacklogRow({ entry }: { entry: LibraryEntry }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 border-b border-line py-1.5">
      <span className="min-w-0 opacity-75">
        <span className="block truncate text-sm font-bold">{entry.title}</span>
        <span className="block truncate text-xs text-ink-soft">
          {entry.game} · {entry.platform}
        </span>
      </span>
      {/* Dashed, because the set exists at RetroAchievements but nothing here
          is mapped to it yet. */}
      {entry.raGameId === undefined ? null : (
        <Badge variant="outline" className="shrink-0 border-dashed">
          RA set
        </Badge>
      )}
    </li>
  );
}
