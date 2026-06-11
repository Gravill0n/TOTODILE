import { Fragment } from "react";
import type { GuideFile, Step } from "../schema";
import { chapterDomId } from "./guideData";
import { StepRow } from "./StepRow";

type NowScreenProps = {
  guide: GuideFile;
  slug: string;
  currentStepId: string | null;
  doneIds: ReadonlySet<string>;
  onToggleDone: (stepId: string) => void;
  onMovePointer: (stepId: string) => void;
};

// The S2 play-view body: the full spine grouped by chapter and section,
// with the current step rendered prominently (FR-A4 lands here). Pure —
// progress state and callbacks come from the screen above (§22.1).
export function NowScreen({
  guide,
  slug,
  currentStepId,
  doneIds,
  onToggleDone,
  onMovePointer,
}: NowScreenProps) {
  return (
    <div className="space-y-8">
      {guide.chapters.map((chapter) => (
        <section
          key={chapter.id}
          id={chapterDomId(chapter.id)}
          className="scroll-mt-4"
        >
          <h2 className="border-b-2 border-line pb-1 text-lg font-bold">
            {chapter.title}
          </h2>
          {chapter.intro ? (
            <p className="mt-2 text-sm text-ink-soft">{chapter.intro}</p>
          ) : null}
          <div className="mt-3 space-y-1">
            {chapter.steps.map((step, index) => (
              <Fragment key={step.id}>
                <SectionHeading
                  step={step}
                  previous={chapter.steps[index - 1]}
                />
                <StepRow
                  step={step}
                  slug={slug}
                  isCurrent={step.id === currentStepId}
                  isDone={doneIds.has(step.id)}
                  onToggleDone={() => onToggleDone(step.id)}
                  onMoveHere={() => onMovePointer(step.id)}
                />
              </Fragment>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SectionHeading({
  step,
  previous,
}: {
  step: Step;
  previous: Step | undefined;
}) {
  if (!step.section || step.section === previous?.section) return null;
  return (
    <h3 className="pt-3 text-sm font-bold text-ink-soft">{step.section}</h3>
  );
}
