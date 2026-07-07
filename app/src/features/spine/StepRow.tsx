import { CheckCheck, SkipForward, TriangleAlert, Trophy } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ZoomableImage } from "@/components/ZoomableImage";
import { guideAssetUrl, stepDomId, stepHeadline } from "@/lib/guide";
import type { Step } from "../schema";

type StepRowProps = {
  step: Step;
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
export function StepRow({
  step,
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
  // Keyword beats show by default (#11); the full prose is one tap away via a
  // Collapsible, which appends below the toggle so opening it never reflows the
  // rows above.
  const detailDisclosure = step.detail ? (
    <Collapsible
      open={showDetail}
      onOpenChange={setShowDetail}
      className="mt-1"
    >
      <CollapsibleTrigger className="text-xs text-ink-soft underline underline-offset-2">
        {showDetail ? "Hide details" : "Details"}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="mt-1 text-sm text-ink-soft">{step.detail}</p>
      </CollapsibleContent>
    </Collapsible>
  ) : null;
  const skipButton = (
    <button
      type="button"
      onClick={onToggleSkip}
      aria-label={`${isSkipped ? "Unskip" : "Skip for later"}: ${shortText}`}
      title={isSkipped ? "Unskip" : "Skip for later"}
      className={`shrink-0 rounded border px-1.5 py-1 ${
        isSkipped ? "border-ink-soft text-ink" : "border-line text-ink-soft"
      }`}
    >
      <SkipForward className="size-3.5" aria-hidden />
    </button>
  );

  return (
    <div
      id={stepDomId(step.id)}
      data-current={isCurrent || undefined}
      className={
        isCurrent
          ? "rounded-lg border-2 border-primary bg-card p-4 shadow-sm"
          : `flex items-start gap-3 rounded px-2 py-2 ${isDone ? "opacity-50" : ""}`
      }
    >
      {isCurrent ? (
        <>
          <p className="mb-1 flex items-center justify-between text-xs font-bold text-primary uppercase">
            Now
            {skipButton}
          </p>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isDone}
              onChange={onToggleDone}
              aria-label={`Done: ${shortText}`}
              className="mt-1 size-5 accent-primary"
            />
            <div className="min-w-0">
              <p className="text-lg">{headline}</p>
              <StepMeta
                step={step}
                isSkipped={isSkipped}
                withMissableMark={false}
              />
              {detailDisclosure}
              {step.missable ? (
                <p className="mt-2 flex items-center gap-1 text-sm font-bold text-missable">
                  <TriangleAlert className="size-4" aria-hidden />
                  Missable — {step.missable.deadline}
                </p>
              ) : null}
              {step.images.map((image) => (
                <ZoomableImage
                  key={image.src}
                  src={guideAssetUrl(slug, image.src)}
                  alt={image.alt}
                  caption={image.caption}
                  credit={image.credit}
                  className="mt-3 max-h-72 rounded border border-line"
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <input
            type="checkbox"
            checked={isDone}
            onChange={onToggleDone}
            aria-label={`Done: ${shortText}`}
            className="mt-1 size-4 shrink-0 accent-primary"
          />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onMoveHere}
              className="w-full text-left"
              title="Move the current-step pointer here"
            >
              <p
                className={
                  isDone ? "line-through" : isSkipped ? "italic opacity-70" : ""
                }
              >
                {headline}
              </p>
              <StepMeta step={step} isSkipped={isSkipped} />
            </button>
            {detailDisclosure}
          </div>
          {!isDone ? skipButton : null}
          {!isDone && !isSkipped ? (
            <button
              type="button"
              onClick={onMarkThrough}
              aria-label={`Mark all through here: ${shortText}`}
              title="Mark every step up to and including this one done"
              className="shrink-0 rounded border border-line px-1.5 py-1 text-ink-soft"
            >
              <CheckCheck className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

function StepMeta({
  step,
  isSkipped,
  withMissableMark = true,
}: {
  step: Step;
  isSkipped: boolean;
  withMissableMark?: boolean;
}) {
  if (!step.missable && step.achievementRefs.length === 0 && !isSkipped) {
    return null;
  }
  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
      {isSkipped ? (
        <Badge variant="outline" className="border-dashed">
          skipped
        </Badge>
      ) : null}
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
      {step.missable && withMissableMark ? (
        <Badge variant="outline" className="border-missable text-missable">
          <TriangleAlert className="size-3" aria-hidden />
          missable
        </Badge>
      ) : null}
    </p>
  );
}
