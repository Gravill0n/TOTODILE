import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The design system (Claude Design project "TOTODILE Design System") is the
// token contract; app/src/index.css is its product-side statement. This guard
// pins the parts of that contract the redesign styles through, and pins the
// parts that must NOT cross over — the system ships specimen-only tokens that
// have no place in product chrome (§9.1: two signals, no third).
const css = readFileSync(
  join(import.meta.dirname, "../../../src/index.css"),
  "utf8",
);

function blockOf(css: string, opener: RegExp): string {
  const start = css.search(opener);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("design-system token contract", () => {
  const theme = blockOf(css, /@theme\s*\{/);
  const themeInline = blockOf(css, /@theme inline\s*\{/);
  const dark = blockOf(css, /:root\[data-theme="dark"\]\s*\{/);

  it("ships the signal tints derived from the two signals", () => {
    for (const token of [
      "--color-missable-bg",
      "--color-missable-ink",
      "--color-warn",
      "--color-warn-bg",
      "--color-warn-ink",
      "--color-ok",
      "--color-ok-bg",
    ]) {
      expect(theme).toContain(token);
      expect(dark).toContain(token);
    }
  });

  it("names the platform type stacks, mono included", () => {
    expect(theme).toMatch(/--font-sans:\s*system-ui/);
    expect(theme).toMatch(/--font-mono:\s*ui-monospace/);
  });

  it("ships both steps of the uppercase tracking scale", () => {
    // Chip caps and section eyebrows track differently in the prototypes.
    expect(theme).toMatch(/--tracking-label:\s*0\.06em/);
    expect(theme).toMatch(/--tracking-eyebrow:\s*0\.12em/);
  });

  it("completes the radius ladder with the 2px rung", () => {
    expect(themeInline).toMatch(/--radius-xs:/);
  });

  it("tints elevation with ink, never neutral black", () => {
    for (const token of ["--shadow-xs", "--shadow-sm", "--shadow-lg"]) {
      expect(theme).toContain(token);
    }
    expect(theme).toMatch(/--shadow-sm:[^;]*rgba\(43, 38, 32/);
  });

  it("keeps design-system-only tokens out of the product", () => {
    // --font-serif is for specimens and printed artifacts; --color-mark names
    // the app-icon teal precisely so it never becomes a UI colour (it also has
    // no dark value, which would break token parity).
    //
    // `[data-theme]` was on this list for the same reason — until 2026-07-31,
    // when §5.4 gained the manual light/auto/dark override and the attribute
    // became the product's own dark-mode selector (src/lib/theme.ts). It is no
    // longer a specimen-only spelling, so only its *specimen* companions are
    // still banned here.
    expect(css).not.toContain("--font-serif");
    expect(css).not.toContain("--color-mark");
  });
});
