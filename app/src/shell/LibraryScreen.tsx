import { Link } from "@tanstack/react-router";
import type { LibraryManifest } from "../schema";
import { GuideCard } from "./GuideCard";

type LibraryScreenProps = {
  library: LibraryManifest;
};

// S1 — the app home. Sorted by last activity once the progress store exists
// (Phase 1 Task 4); title order until then. Settings is reachable from here
// only (§7 navigation map).
export function LibraryScreen({ library }: LibraryScreenProps) {
  const guides = [...library.guides].sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Library</h1>
        <Link to="/settings" className="text-sm text-ink-soft underline">
          Settings
        </Link>
      </header>
      {guides.length === 0 ? (
        <p className="text-ink-soft">No guides yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((entry) => (
            <li key={entry.id}>
              <GuideCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
