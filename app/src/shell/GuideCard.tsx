import { Link } from "@tanstack/react-router";
import type { LibraryEntry, ProgressSlot } from "../schema";

type GuideCardProps = {
  entry: LibraryEntry;
  slot?: ProgressSlot | undefined;
  // Derived from approvals.json (FR-E5): playable → play view; otherwise the
  // card reads "unfinished" and opens into the review lens (§7 nav map).
  playable: boolean;
};

// S1 card: cover, title, language badge, status treatment, and — once a
// slot exists — completion % and current chapter from the denormalized
// stats (FR-A3). One tap → the guide at its current step, or its review lens.
export function GuideCard({ entry, slot, playable }: GuideCardProps) {
  const stats = slot?.stats;
  const completion =
    stats && stats.stepsTotal > 0
      ? Math.round((stats.stepsDone / stats.stepsTotal) * 100)
      : null;
  return (
    <Link
      to={playable ? "/guide/$slug" : "/review/$slug"}
      params={{ slug: entry.id }}
      className={`block rounded-lg border border-line bg-card p-4 shadow-sm ${
        playable ? "" : "opacity-70"
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
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded border border-line px-1 uppercase">
          {entry.language}
        </span>
        {playable ? null : (
          <span className="rounded bg-paper-dim px-1">unfinished</span>
        )}
        {completion !== null ? (
          <span className="font-bold text-accent">{completion}%</span>
        ) : null}
        {stats?.currentChapterTitle ? (
          <span className="text-ink-soft">{stats.currentChapterTitle}</span>
        ) : null}
        {playable && !slot ? (
          <span className="text-ink-soft">not started</span>
        ) : null}
      </p>
    </Link>
  );
}
