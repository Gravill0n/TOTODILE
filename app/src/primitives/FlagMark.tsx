// Subtle marker on rows the compiler emitted with flagged confidence
// (FR-D3); the review lens (Phase 3) is where these get resolved.
export function FlagMark() {
  return (
    <span
      role="img"
      aria-label="Flagged by the compiler"
      title="Flagged by the compiler"
      className="text-xs"
    >
      ⚠
    </span>
  );
}
