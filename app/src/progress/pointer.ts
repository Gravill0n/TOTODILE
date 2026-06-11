// The §6 pointer decision, made executable: the pointer is an explicit
// stored value. It auto-advances ONLY when the step it rests on is checked,
// and the user can move it anywhere. It is never derived from "first
// unchecked" — skips and out-of-order checking must not teleport it.

// Auto-advance target after checking (or skipping, FR-B2) the step the
// pointer rests on: the next step strictly after it in spine order that is
// neither done nor skipped (plain "next step" would strand the pointer on
// a step checked out of order or deliberately deferred). If everything
// after is blocked, the pointer stays where it is.
export function advancePointer(
  stepIds: readonly string[],
  blockedIds: ReadonlySet<string>,
  fromStepId: string,
): string {
  const start = stepIds.indexOf(fromStepId);
  if (start === -1) return fromStepId;
  for (let i = start + 1; i < stepIds.length; i++) {
    const id = stepIds[i];
    if (id !== undefined && !blockedIds.has(id)) return id;
  }
  return fromStepId;
}
