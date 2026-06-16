import type { GuideFile, Visit } from "../schema";

// The "what do I do next" affordance (§6 / Workstream A): from the pointer's
// current step, the visit to head to next. While the current visit still has
// steps after the pointer it stays the answer (you're working through it); once
// the pointer rests on the visit's last step, the next visit in spine order is
// what's coming. Undefined at the end of the route, or if the step is unknown.
// The pointer itself is unchanged — this is a read-only lens over it.
export function preferredNextVisit(
  guide: GuideFile,
  currentStepId: string | null,
): Visit | undefined {
  const visits = guide.chapters.flatMap((chapter) => chapter.visits);
  if (currentStepId === null) return visits[0];
  for (let i = 0; i < visits.length; i++) {
    const visit = visits[i];
    if (visit === undefined) continue;
    const stepIndex = visit.steps.findIndex((s) => s.id === currentStepId);
    if (stepIndex === -1) continue;
    // Steps remain in this visit → stay here; otherwise advance to the next.
    return stepIndex < visit.steps.length - 1 ? visit : visits[i + 1];
  }
  return undefined;
}
