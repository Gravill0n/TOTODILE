import { Link } from "@tanstack/react-router";
import type { LibraryEntry } from "../schema";

type GuideCardProps = {
  entry: LibraryEntry;
};

// S1 card: cover, title, language badge, status treatment. The completion %
// and current-chapter line is a placeholder until the progress store lands
// (Phase 1 Task 4). One tap → the guide at its current step (§7).
export function GuideCard({ entry }: GuideCardProps) {
  const inCompilation = entry.status === "in-compilation";
  return (
    <Link
      to="/guide/$slug"
      params={{ slug: entry.id }}
      className={`block rounded-lg border border-line bg-card p-4 shadow-sm ${
        inCompilation ? "opacity-70" : ""
      }`}
    >
      {entry.cover ? (
        <img
          src={entry.cover}
          alt=""
          className="mb-3 aspect-video w-full rounded object-cover"
        />
      ) : null}
      <h2 className="font-bold">{entry.title}</h2>
      <p className="text-sm text-ink-soft">
        {entry.game} · {entry.platform}
      </p>
      <p className="mt-2 flex items-center gap-2 text-xs">
        <span className="rounded border border-line px-1 uppercase">
          {entry.language}
        </span>
        {inCompilation ? (
          <span className="rounded bg-paper-dim px-1">in compilation</span>
        ) : (
          <span className="text-ink-soft">not started</span>
        )}
      </p>
    </Link>
  );
}
