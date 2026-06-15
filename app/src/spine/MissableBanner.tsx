import type { UpcomingMissable } from "./missables";

type MissableBannerProps = {
  items: UpcomingMissable[];
  onAcknowledge: (stepId: string) => void;
  onJump: (stepId: string) => void;
};

// §7 S2 — the sticky banner that warns about upcoming missables before the
// point of no return (FR-B5). Consistent missable treatment (⚠ + missable
// colour). Pure: callbacks in, no router context, so the guide screen stays
// renderable bare in tests. Acknowledge is the explicit dismissal.
export function MissableBanner({
  items,
  onAcknowledge,
  onJump,
}: MissableBannerProps) {
  if (items.length === 0) return null;
  return (
    <aside
      aria-label="Upcoming missables"
      className="sticky top-0 z-20 mb-4 rounded-lg border border-missable bg-paper-dim p-3 shadow"
    >
      <p className="text-xs font-bold uppercase text-missable">
        ⚠ Upcoming missable{items.length > 1 ? "s" : ""}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={item.stepId}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <span className="min-w-0">
              <span className="text-missable">{item.deadline}</span>
              {item.location ? (
                <span className="ml-2 text-ink-soft">· {item.location}</span>
              ) : null}
            </span>
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => onJump(item.stepId)}
                aria-label={`Go to missable: ${item.deadline}`}
                className="rounded border border-line px-2 py-0.5 text-xs text-ink-soft"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => onAcknowledge(item.stepId)}
                aria-label={`Acknowledge missable: ${item.deadline}`}
                className="rounded border border-missable px-2 py-0.5 text-xs font-bold text-missable"
              >
                Acknowledge
              </button>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
