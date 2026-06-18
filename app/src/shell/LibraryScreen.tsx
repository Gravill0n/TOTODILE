import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { useEditorMode } from "../review/editorMode";
import type { LibraryManifest, ProgressSlot } from "../schema";
import { GuideCard } from "./GuideCard";

type LibraryScreenProps = {
  library: LibraryManifest;
  slots: ProgressSlot[];
  // Derived from each guide's approvals.json (FR-E5); absent key = unfinished.
  playable: Map<string, boolean>;
};

// S1 — the app home. Sorted by last activity (FR-A3); guides never opened
// have no slot and sort last, alphabetically. Settings is reachable from
// here only (§7 navigation map).
export function LibraryScreen({
  library,
  slots,
  playable,
}: LibraryScreenProps) {
  const editorMode = useEditorMode();
  const slotsByGuide = new Map(slots.map((slot) => [slot.guideId, slot]));
  // Player mode stays clean: only playable guides show. Editor mode reveals
  // unfinished guides too, with the in-compilation treatment (§9.3, FR-E1).
  const guides = [...library.guides]
    .filter((entry) => editorMode || playable.get(entry.id) === true)
    .sort((a, b) => {
      const lastA = slotsByGuide.get(a.id)?.lastActivityAt;
      const lastB = slotsByGuide.get(b.id)?.lastActivityAt;
      if (lastA && lastB) return lastB.localeCompare(lastA);
      if (lastA) return -1;
      if (lastB) return 1;
      return a.title.localeCompare(b.title);
    });
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <span className="flex items-center gap-3 text-sm">
          {editorMode ? (
            <Badge variant="secondary" className="uppercase">
              editor mode
            </Badge>
          ) : null}
          <Link to="/settings" className="text-ink-soft underline">
            Settings
          </Link>
        </span>
      </header>
      {guides.length === 0 ? (
        <p className="text-ink-soft">No guides yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((entry) => (
            <li key={entry.id}>
              <GuideCard
                entry={entry}
                slot={slotsByGuide.get(entry.id)}
                playable={playable.get(entry.id) === true}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
