import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type MissableCardProps = {
  deadline: string;
  onAcknowledge: () => void;
};

// FR-B5 — the warning about a point of no return, sitting directly above the
// step that passes it. It used to be a banner stuck to the top of the play
// view, which meant reading "before opening the gate" while looking at some
// other part of the route; here the warning and the thing it warns about are
// the same piece of the page.
//
// The deadline is quoted whole and never truncated — a half-read deadline is
// worse than none. Acknowledge is the explicit dismissal (FR-B5), and it
// persists, so the warning does not come back on the next visit.
export function MissableCard({ deadline, onAcknowledge }: MissableCardProps) {
  return (
    <div className="mt-2.5 mb-0.5 flex items-start gap-2.5 rounded-md border border-missable bg-missable-bg p-3">
      <TriangleAlert
        className="mt-px size-4 shrink-0 text-missable"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-[11px] font-medium tracking-eyebrow text-missable uppercase">
          Missable ahead
        </p>
        <p className="text-sm/5 text-missable-ink text-pretty">{deadline}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAcknowledge}
        aria-label={`Acknowledge missable: ${deadline}`}
        className="shrink-0 border-missable bg-transparent font-medium text-missable"
      >
        Acknowledge
      </Button>
    </div>
  );
}
