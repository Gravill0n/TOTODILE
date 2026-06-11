// The §6 pointer decision, made executable: the pointer is an explicit
// stored value. It auto-advances ONLY when the step it rests on is checked,
// and the user can move it anywhere. It is never derived from "first
// unchecked" — skips and out-of-order checking must not teleport it.

// Auto-advance target after checking the step the pointer rests on: the
// next UNCHECKED step strictly after it in spine order (plain "next step"
// would strand the pointer on a step checked out of order). If everything
// after is checked, the pointer stays where it is.
export function advancePointer(
  stepIds: readonly string[],
  doneIds: ReadonlySet<string>,
  fromStepId: string,
): string {
  const start = stepIds.indexOf(fromStepId);
  if (start === -1) return fromStepId;
  for (let i = start + 1; i < stepIds.length; i++) {
    const id = stepIds[i];
    if (id !== undefined && !doneIds.has(id)) return id;
  }
  return fromStepId;
}
