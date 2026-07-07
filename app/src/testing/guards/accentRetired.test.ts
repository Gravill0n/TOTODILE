import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Closes the F3 deferral: the achievement orange lives only on --primary/--ring
// now. No component — feature or shadcn ui — may use the `accent` colour
// utility; the subtle hover surface uses `muted` instead. (`--color-accent` the
// CSS var stays, as the value --primary aliases.) `accent-foreground` is part
// of the shadcn token set and allowed.
const ACCENT_UTILITY =
  /\b(?:bg|text|border|ring)-accent(?!-foreground)\b|\baccent-accent\b/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

describe("accent utility retired (F3 closure)", () => {
  it("no source file uses the achievement-accent utility", () => {
    // Production source only — colocated tests and src/testing/ are exempt.
    const offenders = walk("src")
      .filter((f) => !/\.test\.tsx?$/.test(f) && !f.includes("src/testing/"))
      .filter((f) => ACCENT_UTILITY.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
