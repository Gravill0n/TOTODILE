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

// One line of the stats column. The only rule in this column is the one down
// its left edge (Library.dc.html) — hairlines between the rows turned three
// figures into a table.
function Stat({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] tracking-eyebrow text-ink-soft uppercase">
        {label}
      </dt>
      <dd
        className={`font-mono text-sm tabular-nums ${muted ? "text-ink-soft" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

// S1 row: cover, what the guide is, how far in you are, and the three figures
// worth scanning down a column — steps, achievements, when you last played.
// One tap → the guide at its current step, or its review lens. Planned entries
// never reach here — the backlog is its own section (#7), with nothing to open
// and no progress to report.
export function GuideRow({ entry, slot, playable, raMapping }: GuideRowProps) {
  const stats = slot?.stats;
  const completion = completionOf(slot);
  // Mastery is the same proxy the cleanup screen uses: an achievement counts
  // as earned when its mapped target is done, so no RA state is stored.
  const achievements = mastery(raMapping, doneIdsOf(slot));

  const card = (
    <Card className="grid gap-4 p-4 shadow-sm transition hover:border-primary sm:grid-cols-[184px_1fr_232px]">
      {entry.cover ? (
        <img
          src={entry.cover}
          alt=""
          className="aspect-video w-full rounded border border-line object-cover"
        />
      ) : (
        // No guide in the library has a cover yet, so the placeholder is the
        // common case — it holds the row's shape rather than collapsing it,
        // and says what it is standing in for.
        <div
          className="grid aspect-video w-full place-items-center rounded-sm border border-line bg-paper-dim"
          aria-hidden
        >
          <span className="text-[10px] tracking-eyebrow text-ink-soft uppercase">
            Cover
          </span>
        </div>
      )}

      <div className="min-w-0">
        <h2 className="text-lg leading-[22px] font-semibold text-pretty">
          {entry.title}
        </h2>
        <p className="text-sm text-ink-soft">
          {entry.game} · {entry.platform}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="uppercase">
            {entry.language}
          </Badge>
          {playable ? null : <Badge variant="secondary">unfinished</Badge>}
        </div>
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
          <span className="font-mono text-lg font-medium text-primary tabular-nums">
            {completion === null ? "—" : `${completion}%`}
          </span>
        </div>
        {/* Two elements, not one string: the chapter is the useful half and
            stays addressable on its own. */}
        <p className="mt-2 text-sm">
          {stats?.currentChapterTitle ? (
            <>
              <span>Next up —</span> <span>{stats.currentChapterTitle}</span>
            </>
          ) : (
            <span>Not started</span>
          )}
        </p>
      </div>

      <dl className="grid content-start gap-2 sm:border-l sm:border-line sm:pl-4">
        <Stat
          label="Steps"
          value={stats ? `${stats.stepsDone} / ${stats.stepsTotal}` : "—"}
          muted={!stats}
        />
        <Stat
          label="Achievements"
          value={
            achievements
              ? `${achievements.earned} / ${achievements.total}`
              : "no RA set"
          }
          muted={achievements === null}
        />
        <Stat
          label="Last played"
          value={slot ? slot.lastActivityAt.slice(0, 10) : "never"}
          muted
        />
      </dl>
    </Card>
  );

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
