import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuideFile } from "@/schema";
import { idTail } from "@/schema";
import { visitIndex } from "./chapterProgress";
import { StepRow } from "./StepRow";

type VisitScreenProps = {
  guide: GuideFile;
  slug: string;
  visitId: string;
  currentStepId: string | null;
  doneIds: ReadonlySet<string>;
  skippedIds: ReadonlySet<string>;
  onToggleDone: (stepId: string) => void;
  onToggleSkip: (stepId: string) => void;
  onMarkThrough: (stepId: string) => void;
  onMovePointer: (stepId: string) => void;
  onOpenVisit: (visitId: string) => void;
};

// The S2 play-view body: ONE visit — the place is the page. The whole spine
// used to scroll here, which for a 587-step guide meant the player scrolled
// past four chapters to reach the room they were standing in.
//
// Pure (§22.1): data + callbacks, no router. Walking to the neighbouring visit
// is `onOpenVisit`, which the shell turns into a URL change — never local
// state, so the address always says where the player is. Browsing is not
// progress: moving between visits leaves the pointer where it was.
export function VisitScreen({
  guide,
  slug,
  visitId,
  currentStepId,
  doneIds,
  skippedIds,
  onToggleDone,
  onToggleSkip,
  onMarkThrough,
  onMovePointer,
  onOpenVisit,
}: VisitScreenProps) {
  const index = visitIndex(guide);
  const here = index.find((entry) => entry.visitId === visitId);
  const chapter = guide.chapters.find((c) => c.id === here?.chapterId);
  const visit = chapter?.visits.find((v) => v.id === visitId);
  // The route validates both ids before this renders; this is the type guard.
  if (!here || !chapter || !visit) return null;

  const nameOf = (id: string | null) =>
    id === null
      ? null
      : (index.find((e) => e.visitId === id)?.locationName ?? null);

  const step = (
    direction: "Previous" | "Next",
    targetVisitId: string | null,
  ) => {
    const name = nameOf(targetVisitId);
    const icon =
      direction === "Previous" ? (
        <ChevronLeft aria-hidden />
      ) : (
        <ChevronRight aria-hidden />
      );
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={targetVisitId === null}
        onClick={
          targetVisitId === null ? undefined : () => onOpenVisit(targetVisitId)
        }
        aria-label={`${direction} visit${name ? ` — ${name}` : ""}`}
        className="min-w-0"
      >
        {direction === "Previous" ? icon : null}
        <span className="truncate">{name ?? `${direction} visit`}</span>
        {direction === "Next" ? icon : null}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      <nav
        aria-label="Visit navigation"
        className="flex items-center justify-between gap-2"
      >
        {step("Previous", here.previousVisitId)}
        {step("Next", here.nextVisitId)}
      </nav>

      <div>
        <p className="text-xs font-bold text-ink-soft uppercase">
          {chapter.title}
        </p>
        <h2 className="border-b-2 border-line pb-1 text-lg font-bold">
          {/* Hash anchor, not <Link>: this component stays free of router
              context so it renders bare. The app runs on hash history. */}
          <a
            href={`#/guide/${slug}/place/${idTail(visit.locationId)}`}
            className="underline decoration-dotted underline-offset-2"
          >
            {here.locationName}
          </a>
        </h2>
        {/* The chapter's framing belongs to the chapter, so it shows on the
            visit that opens it rather than on every visit inside it. */}
        {chapter.intro && chapter.visits[0]?.id === visit.id ? (
          <p className="mt-2 text-sm text-ink-soft">{chapter.intro}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        {visit.steps.map((stepData) => (
          <StepRow
            key={stepData.id}
            step={stepData}
            slug={slug}
            isCurrent={stepData.id === currentStepId}
            isDone={doneIds.has(stepData.id)}
            isSkipped={skippedIds.has(stepData.id)}
            onToggleDone={() => onToggleDone(stepData.id)}
            onToggleSkip={() => onToggleSkip(stepData.id)}
            onMarkThrough={() => onMarkThrough(stepData.id)}
            onMoveHere={() => onMovePointer(stepData.id)}
          />
        ))}
      </div>
    </div>
  );
}
