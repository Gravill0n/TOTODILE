import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useEditorMode } from "@/features/review/editorMode";
import type { LibraryManifest, ProgressSlot, RaMapping } from "@/schema";
import { GuideRow } from "./GuideCard";
import {
  defaultLibraryView,
  LibraryToolbar,
  type LibraryView,
} from "./LibraryToolbar";
import { matchesSearch, sortEntries } from "./libraryView";

type LibraryScreenProps = {
  library: LibraryManifest;
  slots: ProgressSlot[];
  // Derived from each guide's approvals.json (FR-E5); absent key = unfinished.
  playable: Map<string, boolean>;
  // Null for a guide with no RA set, or none compiled yet (§6.5).
  raMappings: Map<string, RaMapping | null>;
};

// S1 — the app home, an index rather than a shelf of covers. Two groups that
// never mix: the guides there is something to play, and the backlog of planned
// ones. Search, filter and sort are view state here and nowhere else — the
// library is a place you pass through. Settings is reachable from here only
// (§7 navigation map).
export function LibraryScreen({
  library,
  slots,
  playable,
  raMappings,
}: LibraryScreenProps) {
  const editorMode = useEditorMode();
  const [view, setView] = useState<LibraryView>(defaultLibraryView);
  const slotsByGuide = new Map(slots.map((slot) => [slot.guideId, slot]));
  const slotOf = (id: string) => slotsByGuide.get(id);

  // Player mode stays clean: only playable guides show — plus planned
  // backlog rows (#7), which are the point of the backlog. Editor mode
  // reveals unfinished guides too, with the in-compilation treatment
  // (§9.3, FR-E1).
  const inLibrary = library.guides.filter(
    (entry) =>
      editorMode ||
      entry.status === "planned" ||
      playable.get(entry.id) === true,
  );
  const tally = `${library.guides.filter((entry) => playable.get(entry.id) === true).length} playable · ${library.guides.filter((entry) => entry.status === "planned").length} planned`;

  const matching = inLibrary.filter((entry) =>
    matchesSearch(entry, view.search),
  );
  // "Playable" means what it says even in editor mode, where the group also
  // holds guides still in compilation.
  const guides =
    view.status === "planned"
      ? []
      : sortEntries(
          matching.filter(
            (entry) =>
              entry.status !== "planned" &&
              (view.status !== "playable" || playable.get(entry.id) === true),
          ),
          view.sort,
          slotOf,
        );
  const backlog =
    view.status === "playable"
      ? []
      : sortEntries(
          matching.filter((entry) => entry.status === "planned"),
          view.sort,
          slotOf,
        );

  const rows = (entries: typeof guides) =>
    entries.map((entry) => (
      <li key={entry.id}>
        <GuideRow
          entry={entry}
          slot={slotOf(entry.id)}
          playable={playable.get(entry.id) === true}
          raMapping={raMappings.get(entry.id) ?? null}
        />
      </li>
    ));

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 border-b-2 border-line pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span>
            <p className="text-xs font-bold tracking-label text-ink-soft uppercase">
              TOTODILE
            </p>
            <h1 className="text-2xl font-bold">Library</h1>
          </span>
          <span className="flex items-center gap-3 text-sm">
            <span className="text-ink-soft tabular-nums">{tally}</span>
            {editorMode ? (
              <Badge variant="secondary" className="uppercase">
                editor mode
              </Badge>
            ) : null}
            <Link to="/settings" className="text-ink-soft underline">
              Settings
            </Link>
          </span>
        </div>
      </header>
      <LibraryToolbar view={view} onChange={setView} />
      {view.status === "planned" ? null : guides.length === 0 ? (
        <p className="text-ink-soft">No playable guides match.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows(guides)}
        </ul>
      )}
      {view.status === "playable" ? null : backlog.length === 0 ? (
        <p className="mt-6 text-ink-soft">Nothing in the backlog matches.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows(backlog)}
        </ul>
      )}
    </main>
  );
}
