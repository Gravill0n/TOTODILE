import type { Step } from "../schema";
import { guideAssetUrl, stepDomId } from "./guideData";

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
// done; tapping the step text moves the pointer here (§6.7 manual move);
// ⏭ is the skip-for-later secondary action (FR-B2) and ✓✓ the P2 burst —
// separate tap targets so nothing happens by accident.
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
  const shortText = step.text.slice(0, 40);
  const skipButton = (
    <button
      type="button"
      onClick={onToggleSkip}
      aria-label={`${isSkipped ? "Unskip" : "Skip for later"}: ${shortText}`}
      title={isSkipped ? "Unskip" : "Skip for later"}
      className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${
        isSkipped ? "border-ink-soft text-ink" : "border-line text-ink-soft"
      }`}
    >
      ⏭
    </button>
  );

  return (
    <div
      id={stepDomId(step.id)}
      data-current={isCurrent || undefined}
      className={
        isCurrent
          ? "rounded-lg border-2 border-accent bg-card p-4 shadow-sm"
          : `flex items-start gap-3 rounded px-2 py-2 ${isDone ? "opacity-50" : ""}`
      }
    >
      {isCurrent ? (
        <>
          <p className="mb-1 flex items-center justify-between text-xs font-bold text-accent uppercase">
            Now
            {skipButton}
          </p>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isDone}
              onChange={onToggleDone}
              aria-label={`Done: ${shortText}`}
              className="mt-1 size-5 accent-accent"
            />
            <div className="min-w-0">
              <p className="text-lg">{step.text}</p>
              <StepMeta
                step={step}
                isSkipped={isSkipped}
                withMissableMark={false}
              />
              {step.missable ? (
                <p className="mt-2 text-sm font-bold text-missable">
                  ⚠ Missable — {step.missable.deadline}
                </p>
              ) : null}
              {step.images.map((image) => (
                <img
                  key={image.src}
                  src={guideAssetUrl(slug, image.src)}
                  alt={image.alt}
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
            className="mt-1 size-4 shrink-0 accent-accent"
          />
          <button
            type="button"
            onClick={onMoveHere}
            className="min-w-0 flex-1 text-left"
            title="Move the current-step pointer here"
          >
            <p
              className={
                isDone ? "line-through" : isSkipped ? "italic opacity-70" : ""
              }
            >
              {step.text}
            </p>
            <StepMeta step={step} isSkipped={isSkipped} />
          </button>
          {!isDone ? skipButton : null}
          {!isDone && !isSkipped ? (
            <button
              type="button"
              onClick={onMarkThrough}
              aria-label={`Mark all through here: ${shortText}`}
              title="Mark every step up to and including this one done"
              className="shrink-0 rounded border border-line px-1.5 py-0.5 text-xs text-ink-soft"
            >
              ✓✓
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
  if (
    !step.missable &&
    step.achievementRefs.length === 0 &&
    !step.location &&
    !isSkipped
  ) {
    return null;
  }
  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
      {isSkipped ? (
        <span className="rounded border border-dashed border-ink-soft px-1">
          skipped
        </span>
      ) : null}
      {step.location ? (
        <span className="rounded border border-line px-1">{step.location}</span>
      ) : null}
      {step.achievementRefs.length > 0 ? (
        <span
          role="img"
          className="font-bold text-accent"
          aria-label={`${step.achievementRefs.length} achievement(s) here`}
        >
          🏆
          {step.achievementRefs.length > 1
            ? ` ×${step.achievementRefs.length}`
            : ""}
        </span>
      ) : null}
      {step.missable && withMissableMark ? (
        <span className="text-missable">⚠ missable</span>
      ) : null}
    </p>
  );
}
