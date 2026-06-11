import type { Step } from "../schema";
import { guideAssetUrl, stepDomId } from "./guideData";

type StepRowProps = {
  step: Step;
  slug: string;
  isCurrent: boolean;
  isDone: boolean;
  onToggleDone: () => void;
  onMoveHere: () => void;
};

// Pure renderer (§22.1): data + callbacks in, UI out. The checkbox toggles
// done; tapping the step text moves the pointer here (§6.7 manual move) —
// two separate tap targets so neither action is accidental.
export function StepRow({
  step,
  slug,
  isCurrent,
  isDone,
  onToggleDone,
  onMoveHere,
}: StepRowProps) {
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
          <p className="mb-1 text-xs font-bold text-accent uppercase">Now</p>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isDone}
              onChange={onToggleDone}
              aria-label={`Done: ${step.text.slice(0, 40)}`}
              className="mt-1 size-5 accent-accent"
            />
            <div className="min-w-0">
              <p className="text-lg">{step.text}</p>
              <StepMeta step={step} withMissableMark={false} />
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
            aria-label={`Done: ${step.text.slice(0, 40)}`}
            className="mt-1 size-4 shrink-0 accent-accent"
          />
          <button
            type="button"
            onClick={onMoveHere}
            className="min-w-0 flex-1 text-left"
            title="Move the current-step pointer here"
          >
            <p className={isDone ? "line-through" : ""}>{step.text}</p>
            <StepMeta step={step} />
          </button>
        </>
      )}
    </div>
  );
}

function StepMeta({
  step,
  withMissableMark = true,
}: {
  step: Step;
  withMissableMark?: boolean;
}) {
  if (!step.missable && step.achievementRefs.length === 0 && !step.location) {
    return null;
  }
  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
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
