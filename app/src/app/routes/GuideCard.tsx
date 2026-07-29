import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { doneIdsOf, mastery } from "@/lib/mastery";
import { cn } from "@/lib/utils";
import type { LibraryEntry, ProgressSlot, RaMapping } from "@/schema";
import { completionOf } from "./libraryView";

type GuideRowProps = {
  entry: LibraryEntry;
  slot?: ProgressSlot | undefined;
  // Derived from approvals.json (FR-E5): playable → play view; otherwise the
  // row reads "unfinished" and opens into the review lens (§7 nav map).
  playable: boolean;
  // The guide's RA set, or null when it has none (§6.5).
  raMapping: RaMapping | null;
};

// One line of the stats column: a label and a figure, hairline-separated.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1 last:border-b-0">
      <dt className="text-xs tracking-label text-ink-soft uppercase">
        {label}
      </dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

// S1 row: cover, what the guide is, how far in you are, and the three figures
// worth scanning down a column — steps, achievements, when you last played.
// One tap → the guide at its current step, or its review lens. Planned entries
// are backlog rows (#7): visible but de-emphasized and not navigable — there is
// no build to open.
export function GuideRow({ entry, slot, playable, raMapping }: GuideRowProps) {
  const planned = entry.status === "planned";
  const stats = slot?.stats;
  const completion = completionOf(slot);
  // Mastery is the same proxy the cleanup screen uses: an achievement counts
  // as earned when its mapped target is done, so no RA state is stored.
  const achievements = mastery(raMapping, doneIdsOf(slot));

  const card = (
    <Card
      className={cn(
        "grid gap-4 p-4 shadow-sm sm:grid-cols-[184px_1fr_232px]",
        !planned && "transition hover:border-primary",
      )}
    >
      {entry.cover ? (
        <img
          src={entry.cover}
          alt=""
          className="aspect-video w-full rounded border border-line object-cover"
        />
      ) : (
        // No guide in the library has a cover yet, so the placeholder is the
        // common case — it holds the row's shape rather than collapsing it.
        <div
          className="aspect-video w-full rounded border border-line bg-paper-dim"
          aria-hidden
        />
      )}

      <div className="min-w-0">
        <h2 className="font-bold">{entry.title}</h2>
        <p className="text-sm text-ink-soft">
          {entry.game} · {entry.platform}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="uppercase">
            {entry.language}
          </Badge>
          {planned ? <Badge variant="secondary">planned</Badge> : null}
          {planned || playable ? null : (
            <Badge variant="secondary">unfinished</Badge>
          )}
        </div>
        {planned ? null : (
          <div className="mt-3 flex items-center gap-3">
            <span className="flex-1">
              <span className="text-xs tracking-label text-ink-soft uppercase">
                Progress
              </span>
              <Progress
                value={completion ?? 0}
                aria-label={`${entry.title} completion`}
                className="mt-1"
              />
            </span>
            {completion === null ? (
              <span className="text-sm text-ink-soft">not started</span>
            ) : (
              <span className="font-mono text-2xl tabular-nums">
                {`${completion}%`}
              </span>
            )}
          </div>
        )}
        {stats?.currentChapterTitle ? (
          // Two elements, not one string: the chapter is the useful half and
          // stays addressable on its own.
          <p className="mt-2 text-sm">
            <span className="text-ink-soft">Next up —</span>{" "}
            <span>{stats.currentChapterTitle}</span>
          </p>
        ) : null}
      </div>

      {planned ? null : (
        <dl className="grid content-start gap-2 sm:border-l sm:border-line sm:pl-4">
          <Stat
            label="Steps"
            value={stats ? `${stats.stepsDone} / ${stats.stepsTotal}` : "—"}
          />
          <Stat
            label="Achievements"
            value={
              achievements
                ? `${achievements.earned} / ${achievements.total}`
                : "no RA set"
            }
          />
          <Stat
            label="Last played"
            value={slot ? slot.lastActivityAt.slice(0, 10) : "never"}
          />
        </dl>
      )}
    </Card>
  );

  if (planned) {
    return <div className="block opacity-50">{card}</div>;
  }
  return (
    <Link
      to={playable ? "/guide/$slug" : "/review/$slug"}
      params={{ slug: entry.id }}
      className={cn("block", !playable && "opacity-70")}
    >
      {card}
    </Link>
  );
}
