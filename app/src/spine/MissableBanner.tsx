import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UpcomingMissable } from "./missables";

type MissableBannerProps = {
  items: UpcomingMissable[];
  onAcknowledge: (stepId: string) => void;
  onJump: (stepId: string) => void;
};

// §7 S2 — the sticky banner that warns about upcoming missables before the
// point of no return (FR-B5). Consistent missable treatment (alert icon +
// missable colour). Pure: callbacks in, no router context, so the guide stays
// renderable bare in tests. Acknowledge is the explicit dismissal.
export function MissableBanner({
  items,
  onAcknowledge,
  onJump,
}: MissableBannerProps) {
  if (items.length === 0) return null;
  return (
    <aside
      role="alert"
      aria-label="Upcoming missables"
      className="sticky top-0 z-20 mb-4 rounded-lg border border-missable bg-paper-dim p-3 shadow"
    >
      <p className="flex items-center gap-1 text-xs font-bold text-missable uppercase">
        <TriangleAlert className="size-3.5" aria-hidden />
        Upcoming missable{items.length > 1 ? "s" : ""}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={item.stepId}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-missable text-missable"
              >
                {item.deadline}
              </Badge>
              {item.location ? (
                <span className="text-ink-soft">· {item.location}</span>
              ) : null}
            </span>
            <span className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onJump(item.stepId)}
                aria-label={`Go to missable: ${item.deadline}`}
              >
                Go
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAcknowledge(item.stepId)}
                aria-label={`Acknowledge missable: ${item.deadline}`}
                className="border-missable font-bold text-missable"
              >
                Acknowledge
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
