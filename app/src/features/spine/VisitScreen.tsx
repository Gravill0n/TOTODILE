import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import type { GuideFile } from "@/schema";
import { visitIndex } from "./chapterProgress";
import { MissableCard } from "./MissableCard";
import { StepRow } from "./StepRow";
import { useInView } from "./useInView";

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
  /** Scroll the current step back into view — the same move as "Where am I". */
  onBackToNow: () => void;
  /** Steps whose missable is still ahead and unacknowledged (FR-B5). */
  missableStepIds: ReadonlySet<string>;
  onAcknowledgeMissable: (stepId: string) => void;
};

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

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
  onBackToNow,
  missableStepIds,
  onAcknowledgeMissable,
}: VisitScreenProps) {
  // Watching the current row is what decides whether the page needs to offer
  // a way back to it; with no row on this page there is nothing to offer.
  const { ref: nowRef, inView: nowInView } = useInView<HTMLDivElement>();
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

  // "step 5 of 14" only means something while the pointer is on this page;
  // browsing elsewhere gets the plain count instead of a stale position.
  const pointerAt = visit.steps.findIndex((s) => s.id === currentStepId);
  const position =
    pointerAt === -1
      ? count(visit.steps.length, "step")
      : `step ${pointerAt + 1} of ${visit.steps.length}`;

  const achievements = visit.steps.reduce(
    (total, s) => total + s.achievementRefs.length,
    0,
  );

  const walk = (
    direction: "Previous" | "Next",
    targetVisitId: string | null,
    variant: "compact" | "named",
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
        className={variant === "compact" ? "shrink-0 px-2" : "min-w-0"}
      >
        {direction === "Previous" ? icon : null}
        {/* The pair beside the breadcrumb is two glyphs; the pair at the foot
            of the page names where it is going, because by then the heading
            has scrolled away. */}
        {variant === "named" ? (
          <span className="truncate">{name ?? `${direction} visit`}</span>
        ) : null}
        {direction === "Next" ? icon : null}
      </Button>
    );
  };

  return (
    <div>
      {/* Sticky on the column, on the column's own background, so step rows
          disappear cleanly underneath it. */}
      <Breadcrumb className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-line bg-paper py-3">
        <BreadcrumbList className="flex-1 gap-1.5 text-xs text-ink-soft sm:gap-1.5">
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-ink">
              {chapter.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator>·</BreadcrumbSeparator>
          <BreadcrumbItem>
            {here.locationName} · visit {here.ordinalAtLocation}
          </BreadcrumbItem>
          <BreadcrumbSeparator>·</BreadcrumbSeparator>
          <BreadcrumbItem className="font-mono tabular-nums">
            {position}
          </BreadcrumbItem>
        </BreadcrumbList>
        <span className="flex shrink-0 items-center gap-2">
          {/* Only while the row it points at is off screen — otherwise this is
              a button that scrolls you to what you are already looking at. */}
          {pointerAt !== -1 && !nowInView ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToNow}
              className="max-w-56 shrink-0 border-primary text-primary"
            >
              <span className="truncate">
                {`Back to NOW — ${visit.steps[pointerAt]?.keywords[0] ?? ""}`}
              </span>
            </Button>
          ) : null}
          {walk("Previous", here.previousVisitId, "compact")}
          {walk("Next", here.nextVisitId, "compact")}
        </span>
      </Breadcrumb>

      <h2 className="mt-5 text-2xl font-bold tracking-tight">
        {here.locationName}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {`Visit ${here.ordinalAtLocation} of ${here.visitsAtLocation} · ${count(visit.steps.length, "step")}`}
        {achievements > 0 ? ` · ${count(achievements, "achievement")}` : ""}
      </p>
      {/* The chapter's framing belongs to the chapter, so it shows on the
          visit that opens it rather than on every visit inside it. */}
      {chapter.intro && chapter.visits[0]?.id === visit.id ? (
        <p className="mt-3 text-sm text-ink-soft">{chapter.intro}</p>
      ) : null}

      <div className="mt-5 space-y-1">
        {visit.steps.map((stepData) => (
          <div key={stepData.id}>
            {/* The warning sits with the step that passes the deadline, not at
                the top of a page you may have scrolled away from. */}
            {stepData.missable && missableStepIds.has(stepData.id) ? (
              <MissableCard
                deadline={stepData.missable.deadline}
                onAcknowledge={() => onAcknowledgeMissable(stepData.id)}
              />
            ) : null}
            <StepRow
              step={stepData}
              slug={slug}
              ref={stepData.id === currentStepId ? nowRef : undefined}
              isCurrent={stepData.id === currentStepId}
              isDone={doneIds.has(stepData.id)}
              isSkipped={skippedIds.has(stepData.id)}
              onToggleDone={() => onToggleDone(stepData.id)}
              onToggleSkip={() => onToggleSkip(stepData.id)}
              onMarkThrough={() => onMarkThrough(stepData.id)}
              onMoveHere={() => onMovePointer(stepData.id)}
            />
          </div>
        ))}
      </div>

      <nav
        aria-label="Visit navigation"
        className="mt-6 flex items-center justify-between gap-3"
      >
        {walk("Previous", here.previousVisitId, "named")}
        {walk("Next", here.nextVisitId, "named")}
      </nav>
    </div>
  );
}
