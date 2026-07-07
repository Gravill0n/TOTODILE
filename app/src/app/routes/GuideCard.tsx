import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
// Planned entries are backlog rows (#7): visible but de-emphasized and not
// navigable — there is no build to open.
export function GuideCard({ entry, slot, playable }: GuideCardProps) {
  const planned = entry.status === "planned";
  const stats = slot?.stats;
  const completion =
    stats && stats.stepsTotal > 0
      ? Math.round((stats.stepsDone / stats.stepsTotal) * 100)
      : null;
  const card = (
    <Card
      className={cn(
        "gap-2 p-4 shadow-sm",
        !planned && "transition hover:border-primary",
      )}
    >
      {entry.cover ? (
        <img
          src={entry.cover}
          alt=""
          className="mb-1 aspect-video w-full rounded object-cover"
        />
      ) : null}
      <h2 className="font-bold">{entry.title}</h2>
      <p className="text-sm text-ink-soft">
        {entry.game} · {entry.platform}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="uppercase">
          {entry.language}
        </Badge>
        {planned ? <Badge variant="secondary">planned</Badge> : null}
        {planned || playable ? null : (
          <Badge variant="secondary">unfinished</Badge>
        )}
        {completion !== null ? <Badge>{completion}%</Badge> : null}
        {stats?.currentChapterTitle ? (
          <span className="text-ink-soft">{stats.currentChapterTitle}</span>
        ) : null}
        {playable && !slot ? (
          <span className="text-ink-soft">not started</span>
        ) : null}
      </div>
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
