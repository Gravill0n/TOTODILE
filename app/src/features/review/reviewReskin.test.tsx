import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// R6: the review lens drops the legacy achievement-accent utility (reclaimed for
// shadcn's hover surface in the F3 flip) and adopts shadcn Button/Badge/Input.
const LEGACY_ACCENT =
  /\b(?:text|border|bg)-accent(?!-foreground)\b|\baccent-accent\b/;
const source = (p: string) => readFileSync(`src/${p}`, "utf8");

const REVIEW_FILES = [
  "review/LayerReviewCard.tsx",
  "review/SpotCheckRow.tsx",
  "review/RowSourceColumns.tsx",
  "review/VerdictControls.tsx",
];

describe("review lens reskin (R6)", () => {
  for (const file of REVIEW_FILES) {
    it(`${file} no longer uses the legacy accent utility`, () => {
      expect(source(file)).not.toMatch(LEGACY_ACCENT);
    });
  }

  it("the review cards adopt shadcn Badge, with Button + Input in the shared verdict controls", () => {
    expect(source("review/LayerReviewCard.tsx")).toContain(
      'from "@/components/ui/badge"',
    );
    const controls = source("review/VerdictControls.tsx");
    expect(controls).toContain('from "@/components/ui/button"');
    expect(controls).toContain('from "@/components/ui/input"');
  });
});
