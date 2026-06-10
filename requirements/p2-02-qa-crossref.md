# Requirement: QA Pass Cross-Reference Checks

Implementation: `src/schema/qaCrossref.ts` (TypeScript).
PRD refs: FR-D4 (QA pass rejects broken cross-references before human review),
§10.3, §11.1. Runs over already-structurally-valid data (spine per `p0-02`,
widgets per `p0-03`, mapping per `p0-06`) and finds the problems no single-file
validation can see.

## Exports

```typescript
export type QaIssue = {
  code:
    | "widgetUnknownChapter"     // widget.chapterId not a chapter of the spine
    | "mappingUnknownStep"       // mapping entry's stepId not in the spine
    | "achievementNotMapped"     // step lists an RA achievement id absent from the mapping
    | "mappedAchievementUnknown" // mapping raId not listed on any step's achievements
    ;
  subject: string;               // the offending id (widgetId, stepId, or raId)
  detail: string;                // human-readable, non-empty
};

export function qaCrossref(input: {
  spine: GuideSpine;             // types from p0-02
  widgets: Widget[];             // types from p0-03
  mapping: RaMapping | null;     // null = guide has no RA mapping (legal, §11.2)
}): QaIssue[];
```

## Rules

1. `widgetUnknownChapter`: emitted per widget whose `chapterId` is non-null and
   not the id of any spine chapter. Standalone widgets (`chapterId: null`) never
   trigger it.
2. `mappingUnknownStep`: emitted per mapping entry whose `stepId` is not a step
   of the spine; `subject` is the stepId.
3. `achievementNotMapped`: emitted per (step, achievement id) where the step's
   `achievements` array contains an raId with no entry in the mapping; `subject`
   is the raId. **Severity note in detail**: this is a warning-level issue, but
   it is still reported (the receipt's "unmapped" bucket exists for runtime —
   compile time should still surface it).
4. `mappedAchievementUnknown`: emitted per mapping entry whose raId is not listed
   in any step's `achievements`; `subject` is the raId.
5. `mapping: null` → rules 2–4 are skipped entirely (no issues from them).
6. Issue order: all `widgetUnknownChapter` (widget input order), then
   `mappingUnknownStep` (entry order), then `achievementNotMapped` (spine order),
   then `mappedAchievementUnknown` (entry order).
7. A clean guide returns `[]`. Pure function; inputs not mutated.

## Examples

Spine: chapters `ch1` (step `g:ch1:s1` with `achievements: ["100"]`), `ch2`
(step `g:ch2:s2`, no achievements). Widgets: `W1(chapterId: "ch1")`,
`W2(chapterId: null)`. Mapping entries: `(raId "100" → g:ch1:s1)`.

| Variation | Issues |
|-----------|--------|
| As described | `[]` |
| W1's chapterId → `"ch9"` | one `widgetUnknownChapter`, subject = W1's id |
| Mapping entry `("200" → g:ch9:s9)` added | `mappingUnknownStep` (subject `g:ch9:s9`) AND `mappedAchievementUnknown` (subject `200`) |
| Step `s1` achievements → `["100", "101"]` | one `achievementNotMapped`, subject `101` |
| Mapping replaced by `null`, step still lists `["100"]` | `[]` (rule 5) |
| Mapping entry `("100" → g:ch1:s1)` plus step lists `[]` | one `mappedAchievementUnknown`, subject `100` |
| Both a bad widget AND a bad mapping entry | widget issue first (rule 6) |
