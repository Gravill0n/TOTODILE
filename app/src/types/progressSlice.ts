// What primitive renderers see of progress: plain data, no storage access
// (§22.1). The screen layer derives this from the slot and passes it down.
export type ProgressSlice = {
  doneIds: ReadonlySet<string>;
  counterValues: Readonly<Record<string, number>>;
  /**
   * Items the step under the pointer hands over (`checkable.stepRef`), so a
   * renderer can point at the row you are about to tick. Presentation only —
   * nothing here changes done state, and it travels on the slice rather than
   * as a prop so all seven primitives get it without seven new signatures.
   */
  highlightIds?: ReadonlySet<string>;
};
