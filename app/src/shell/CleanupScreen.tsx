import { Link } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { useGuideProgress } from "../progress/useGuideProgress";
import type { GuideFile, LibraryEntry, RaMapping } from "../schema";
import { type CleanupItem, collectCleanupTasks, mastery } from "./cleanupTasks";

type CleanupScreenProps = {
  entry: LibraryEntry;
  guide: GuideFile;
  raMapping: RaMapping | null;
};

function TaskRow({
  item,
  onToggleDone,
}: {
  item: CleanupItem;
  onToggleDone: (itemId: string) => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded px-2 py-1.5">
      {item.kind === "counter" ? (
        <span className="mt-0.5 shrink-0 rounded border border-line px-1 text-xs text-ink-soft tabular-nums">
          {item.counter?.value}/{item.counter?.target}
        </span>
      ) : (
        <Checkbox
          checked={false}
          aria-label={`Done: ${item.label.slice(0, 40)}`}
          onCheckedChange={() => onToggleDone(item.itemId)}
          className="mt-1"
        />
      )}
      <span className="min-w-0">
        <span className={item.skipped ? "italic opacity-70" : ""}>
          {item.label}
        </span>
        {item.skipped ? (
          <span className="ml-2 rounded border border-dashed border-ink-soft px-1 text-xs text-ink-soft">
            skipped
          </span>
        ) : null}
      </span>
    </li>
  );
}

// S4 — the post-game cleanup view (FR-B4, P7). Manual switch from the guide; no
// auto-trigger. Owns the progress slot so ticking an item here persists like
// anywhere else, and the item drops off the list on the next render.
export function CleanupScreen({ entry, guide, raMapping }: CleanupScreenProps) {
  const progress = useGuideProgress(guide);

  const back = (
    <Link
      to="/guide/$slug"
      params={{ slug: entry.id }}
      className="text-sm text-ink-soft underline"
    >
      Back to the guide
    </Link>
  );

  if (!progress.ready) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-ink-soft">Loading progress…</p>
      </main>
    );
  }

  const groups = collectCleanupTasks(guide, {
    doneIds: progress.doneIds,
    skippedIds: progress.skippedIds,
    counterValues: progress.counterValues,
  });
  const m = mastery(raMapping, progress.doneIds);
  const remaining = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold">Cleanup — {entry.title}</h1>
        {back}
      </header>

      {m ? (
        <section className="mb-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-bold">Mastery</span>
            <span className="text-ink-soft">
              {m.earned}/{m.total} · {m.total - m.earned} achievement(s)
              remaining
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded bg-paper-dim">
            <div
              className="h-full bg-primary"
              style={{ width: `${m.total ? (m.earned / m.total) * 100 : 0}%` }}
            />
          </div>
        </section>
      ) : null}

      {remaining === 0 ? (
        <p className="text-ink-soft">All clean — nothing left to mop up.</p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-1 text-sm font-bold text-ink-soft uppercase">
                {group.label}
              </h2>
              <ul>
                {group.items.map((item) => (
                  <TaskRow
                    key={item.itemId}
                    item={item}
                    onToggleDone={progress.toggleDone}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
