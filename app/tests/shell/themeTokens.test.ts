import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// §5.4: dark mode honors the system preference by swapping the same token
// set under prefers-color-scheme — a token defined in only one mode would
// silently fall back to the other palette's value. Guard the parity.
const css = readFileSync(
  join(import.meta.dirname, "../../src/index.css"),
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
  const dark = tokensIn(
    blockOf(css, /@media \(prefers-color-scheme: dark\)[\s\S]*?:root\s*\{/),
  );

  it("defines the palette in the @theme block", () => {
    expect(light.length).toBeGreaterThan(0);
  });

  it("overrides every token in dark mode, and only those", () => {
    expect(dark).toEqual(light);
  });

  it("opts form controls and scrollbars into both schemes", () => {
    expect(css).toMatch(/color-scheme:\s*light dark/);
  });
});
