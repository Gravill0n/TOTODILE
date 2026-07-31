import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// §5.4: dark mode swaps the same token set under `[data-theme="dark"]` (the
// attribute src/lib/theme.ts stamps, resolving the system preference for
// `auto`) — a token defined in only one mode would silently fall back to the
// other palette's value. Guard the parity.
const css = readFileSync(
  join(import.meta.dirname, "../../../src/index.css"),
  "utf8",
);

function tokensIn(block: string): string[] {
  return [...block.matchAll(/--color-[\w-]+(?=\s*:)/g)]
    .map((match) => match[0])
    .sort();
}

function blockOf(css: string, opener: RegExp): string {
  const start = css.search(opener);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("paper-guide theme tokens", () => {
  const light = tokensIn(blockOf(css, /@theme\s*\{/));
  const dark = tokensIn(blockOf(css, /:root\[data-theme="dark"\]\s*\{/));

  it("defines the palette in the @theme block", () => {
    expect(light.length).toBeGreaterThan(0);
  });

  it("overrides every token in dark mode, and only those", () => {
    expect(dark).toEqual(light);
  });

  it("opts form controls and scrollbars into both schemes", () => {
    expect(css).toMatch(/color-scheme:\s*light dark/);
  });

  // An override that leaves `color-scheme` on the system's answer gives dark
  // form controls on a manually-light page (and vice versa).
  it("pins color-scheme to each resolved theme", () => {
    expect(css).toMatch(
      /:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light/,
    );
    expect(css).toMatch(
      /:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark/,
    );
  });
});
