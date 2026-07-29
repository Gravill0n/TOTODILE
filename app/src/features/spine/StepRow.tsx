import { CheckCheck, SkipForward, TriangleAlert, Trophy } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ZoomableImage } from "@/components/ZoomableImage";
import { guideAssetUrl, stepDomId, stepHeadline } from "@/lib/guide";
import { cn } from "@/lib/utils";
import type { Step } from "@/schema";

type StepRowProps = {
  step: Step;
  // The visit watches the current row to know whether it is still on screen.
  ref?: Ref<HTMLDivElement>;
  slug: string;
  isCurrent: boolean;
  isDone: boolean;
  isSkipped: boolean;
  onToggleDone: () => void;
  onToggleSkip: () => void;
  onMarkThrough: () => void;
  onMoveHere: () => void;
};

// Pure renderer (§22.1): data + callbacks in, UI out. The checkbox toggles
// done; tapping the step text moves the pointer here (§6.7 manual move); the
// skip icon is the skip-for-later secondary action (FR-B2) and the
// mark-through icon the P2 burst — separate tap targets so nothing happens by
// accident.
//
// Every row has the same anatomy — icon, beats, badges, the two icon actions.
// The current one is *marked* (border, fill, NOW, bigger type), not built
// differently: the row used to be two separate branches, so the item icon
// existed only on the current card and the burst action only on the others.
export function StepRow({
  step,
  ref,
  slug,
  isCurrent,
  isDone,
  isSkipped,
  onToggleDone,
  onToggleSkip,
  onMarkThrough,
  onMoveHere,
}: StepRowProps) {
  const headline = stepHeadline(step);
  const shortText = headline.slice(0, 40);
  const [showDetail, setShowDetail] = useState(false);
  const icon = step.images[0];

  const action = (
    label: string,
    title: string,
    onClick: () => void,
    glyph: ReactNode,
    disabled = false,
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${shortText}`}
      title={title}
      className="grid size-[26px] shrink-0 place-items-center rounded-sm border border-line text-ink-soft disabled:opacity-40"
    >
      {glyph}
    </button>
  );

  return (
    <div
      ref={ref}
      id={stepDomId(step.id)}
      data-current={isCurrent || undefined}
      className={cn(
        "flex items-start gap-3.5",
        isCurrent
          ? "rounded-lg border border-primary bg-card p-4 shadow-sm"
          : "px-2 py-2.5",
        isDone ? "opacity-50" : isSkipped ? "opacity-70" : undefined,
      )}
    >
      <input
        type="checkbox"
        checked={isDone}
        onChange={onToggleDone}
        aria-label={`Done: ${shortText}`}
        className={cn(
          "mt-0.5 shrink-0 accent-primary",
          isCurrent ? "size-5" : "size-4",
        )}
      />

      {/* The item at sprite size, on every row — "which bag was it again" is a
          question a row should answer at a glance, and the answer used to be
          on the current card only. Still the lightbox underneath. */}
      {icon ? (
        <ZoomableImage
          src={guideAssetUrl(slug, icon.src)}
          alt={icon.alt}
          caption={icon.caption}
          credit={icon.credit}
          className="size-9 rounded-sm border border-line bg-card object-contain [image-rendering:pixelated]"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {isCurrent ? (
          <p className="text-[11px] font-bold tracking-eyebrow text-primary uppercase">
            Now
          </p>
        ) : null}
        {/* One beat per line. A step's keywords are a sequence of actions —
            "Talk to gatekeeper ×2" then "Take rusty lantern" — and joining
            them with separators made two things read as one sentence to
            parse. Spans rather than a list because a <ul> is not valid inside
            a <button>, and the button has to stay whole: tapping any line
            moves the pointer. */}
        <button
          type="button"
          onClick={onMoveHere}
          title="Move the current-step pointer here"
          className={cn(
            "flex flex-col items-start gap-0.5 text-left",
            isCurrent ? "text-lg/6" : "text-sm/5",
            isDone ? "line-through" : isSkipped ? "italic" : undefined,
          )}
        >
          {step.keywords.map((beat) => (
            <span key={beat} className="block text-pretty">
              {beat}
            </span>
          ))}
        </button>

        {/* Keyword beats show by default (#11); the full prose is one tap away
            via a Collapsible, which appends below the badge row so opening it
            never reflows the rows above. */}
        <Collapsible open={showDetail} onOpenChange={setShowDetail}>
          <div className="flex flex-wrap items-center gap-2">
            {step.achievementRefs.length > 0 ? (
              <Badge
                aria-label={`${step.achievementRefs.length} achievement(s) here`}
              >
                <Trophy className="size-3" aria-hidden />
                {step.achievementRefs.length > 1
                  ? `×${step.achievementRefs.length}`
                  : ""}
              </Badge>
            ) : null}
            {/* The badge marks the row; the deadline itself is quoted by the
                MissableCard above it while the deadline is still ahead, and
                carried here as the badge's title once that card is gone. */}
            {step.missable ? (
              <Badge
                variant="outline"
                title={step.missable.deadline}
                className="border-missable text-missable"
              >
                <TriangleAlert className="size-3" aria-hidden />
                missable
              </Badge>
            ) : null}
            {isSkipped ? (
              <Badge variant="outline" className="border-dashed text-ink-soft">
                skipped
              </Badge>
            ) : null}
            {step.detail ? (
              <CollapsibleTrigger className="text-xs text-ink-soft underline underline-offset-2">
                {showDetail ? "Hide details" : "Details"}
              </CollapsibleTrigger>
            ) : null}
            <span className="ms-auto flex shrink-0 gap-1.5">
              {/* Every row keeps both actions so the anatomy never shifts,
                  but skipping something already done is a no-op in the slot
                  (uncheck it first) — so the control says so rather than
                  lying. */}
              {action(
                isSkipped ? "Unskip" : "Skip for later",
                isSkipped ? "Unskip" : "Skip for later",
                onToggleSkip,
                <SkipForward className="size-3.5" aria-hidden />,
                isDone,
              )}
              {action(
                "Mark all through here",
                "Mark every step up to and including this one done",
                onMarkThrough,
                <CheckCheck className="size-3.5" aria-hidden />,
              )}
            </span>
          </div>
          <CollapsibleContent>
            <p className="mt-1.5 text-sm/5 text-ink-soft text-pretty">
              {step.detail}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
