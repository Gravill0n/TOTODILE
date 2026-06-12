import { Link } from "@tanstack/react-router";
import type { LibraryEntry, ProgressSlot } from "../schema";

type GuideCardProps = {
  entry: LibraryEntry;
  slot?: ProgressSlot | undefined;
};

// S1 card: cover, title, language badge, status treatment, and — once a
// slot exists — completion % and current chapter from the denormalized
// stats (FR-A3). One tap → the guide at its current step (§7).
export function GuideCard({ entry, slot }: GuideCardProps) {
  const inCompilation = entry.status === "in-compilation";
  const stats = slot?.stats;
  const completion =
    stats && stats.stepsTotal > 0
      ? Math.round((stats.stepsDone / stats.stepsTotal) * 100)
      : null;
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
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded border border-line px-1 uppercase">
          {entry.language}
        </span>
        {inCompilation ? (
          <span className="rounded bg-paper-dim px-1">in compilation</span>
        ) : null}
        {completion !== null ? (
          <span className="font-bold text-accent">{completion}%</span>
        ) : null}
        {stats?.currentChapterTitle ? (
          <span className="text-ink-soft">{stats.currentChapterTitle}</span>
        ) : null}
        {!slot && !inCompilation ? (
          <span className="text-ink-soft">not started</span>
        ) : null}
      </p>
    </Link>
  );
}
