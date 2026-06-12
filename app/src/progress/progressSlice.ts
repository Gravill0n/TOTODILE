// What primitive renderers see of progress: plain data, no storage access
// (§22.1). The screen layer derives this from the slot and passes it down.
export type ProgressSlice = {
  doneIds: ReadonlySet<string>;
  counterValues: Readonly<Record<string, number>>;
};
