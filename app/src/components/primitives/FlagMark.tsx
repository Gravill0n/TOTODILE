import { TriangleAlert } from "lucide-react";

// Subtle marker on rows the compiler emitted with flagged confidence
// (FR-D3); the review lens (Phase 3) is where these get resolved. The lucide
// glyph is decorative (aria-hidden); the wrapping span carries the accessible
// label so the marker is announced once.
export function FlagMark() {
  return (
    <span
      role="img"
      aria-label="Flagged by the compiler"
      title="Flagged by the compiler"
      className="inline-flex align-middle text-missable"
    >
      <TriangleAlert className="inline size-3" aria-hidden />
    </span>
  );
}
