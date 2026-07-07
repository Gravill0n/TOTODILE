import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// R8: no emoji affordances anywhere in the app source — every one is a lucide
// icon now. Scoped to pictographic emoji + the checkmark/cross/warning dingbats
// that were used as UI glyphs; plain typographic arrows (→ ← in comments and
// prose) and math signs (× −) are not affordances and are allowed.
// (FE0F variation selectors always trail an emoji base already in these
// ranges, so they need no separate clause.)
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/u;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

describe("emoji sweep (R8)", () => {
  // Source only — guide content/data (guides/*, fixtures) is exempt (§0.2),
  // as are colocated tests and src/testing/ (production source only).
  const files = walk("src").filter(
    (f) => !/\.test\.tsx?$/.test(f) && !f.includes("src/testing/"),
  );

  it("has no emoji affordances left in src", () => {
    const offenders = files.filter((f) => EMOJI.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
