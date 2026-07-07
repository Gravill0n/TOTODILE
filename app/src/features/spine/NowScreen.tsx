import { chapterDomId } from "@/lib/guide";
import type { GuideFile } from "../schema";
import { preferredNextVisit } from "./preferredNext";
import { StepRow } from "./StepRow";

type NowScreenProps = {
  guide: GuideFile;
  slug: string;
  currentStepId: string | null;
  doneIds: ReadonlySet<string>;
  skippedIds: ReadonlySet<string>;
  onToggleDone: (stepId: string) => void;
  onToggleSkip: (stepId: string) => void;
  onMarkThrough: (stepId: string) => void;
  onMovePointer: (stepId: string) => void;
};

// The S2 play-view body: the full spine grouped chapter → visit → step, with
// each visit headed by its location and the current step rendered prominently
// (FR-A4 lands here). Pure — progress state and callbacks come from the screen
// above (§22.1). Rich place-first navigation is Phase D; this renders plainly.
export function NowScreen({
  guide,
  slug,
  currentStepId,
  doneIds,
  skippedIds,
  onToggleDone,
  onToggleSkip,
  onMarkThrough,
  onMovePointer,
}: NowScreenProps) {
  const locationName = new Map(guide.locations.map((l) => [l.id, l.name]));
  // FR "what do I do next": the preferred-next visit (D2) — the place to head
  // to — surfaced as a link to its place screen. Read-only over the pointer;
  // checking/skipping is unchanged.
  const nextVisit = preferredNextVisit(guide, currentStepId);
  const nextName = nextVisit
    ? (locationName.get(nextVisit.locationId) ?? nextVisit.locationId)
    : null;
  return (
    <div className="space-y-8">
      {nextVisit && nextName ? (
        <a
          href={`#/guide/${slug}/place/${nextVisit.locationId.split(":")[1] ?? ""}`}
          className="block rounded-lg border border-primary bg-card px-3 py-2 text-sm font-bold text-primary"
        >
          Next up — {nextName}
        </a>
      ) : null}
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
          {chapter.visits.map((visit) => (
            <div key={visit.id} className="mt-3">
              <h3 className="pt-2 text-sm font-bold text-ink-soft">
                {/* Hash anchor (no router context — NowScreen renders bare in
                    tests): opens the place screen for this location. */}
                <a
                  href={`#/guide/${slug}/place/${visit.locationId.split(":")[1] ?? ""}`}
                  className="underline decoration-dotted underline-offset-2"
                >
                  {locationName.get(visit.locationId) ?? visit.locationId}
                </a>
              </h3>
              <div className="mt-1 space-y-1">
                {visit.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    slug={slug}
                    isCurrent={step.id === currentStepId}
                    isDone={doneIds.has(step.id)}
                    isSkipped={skippedIds.has(step.id)}
                    onToggleDone={() => onToggleDone(step.id)}
                    onToggleSkip={() => onToggleSkip(step.id)}
                    onMarkThrough={() => onMarkThrough(step.id)}
                    onMoveHere={() => onMovePointer(step.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
