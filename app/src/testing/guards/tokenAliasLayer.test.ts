import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// F3: index.css carries the shadcn semantic token set aliased onto the paper
// palette, and keeps dark as a media query (no `.dark` class). This guards the
// token contract (§9.1/§22.1) and the dark model (§5.4).
const css = readFileSync(
  fileURLToPath(new URL("../../src/index.css", import.meta.url)),
  "utf8",
);
// Comments may legitimately mention `.dark` while explaining the media-query
// model; only the actual CSS counts for the no-`.dark`-selector guard.
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

const SEMANTIC_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--popover",
  "--primary",
  "--secondary",
  "--muted",
  "--accent",
  "--destructive",
  "--border",
  "--input",
  "--ring",
  "--radius",
];

describe("token alias layer (index.css)", () => {
  it("imports tw-animate-css", () => {
    expect(css).toContain('@import "tw-animate-css"');
  });

  it("declares the full standard shadcn semantic token set", () => {
    for (const token of SEMANTIC_TOKENS) {
      expect(css, `missing ${token}`).toMatch(new RegExp(`${token}\\s*:`, "m"));
    }
  });

  it("aliases the semantic tokens onto the paper palette vars", () => {
    // Taste-source stays the paper palette: semantics resolve through it.
    expect(css).toMatch(/--background:\s*var\(--color-paper\)/);
    expect(css).toMatch(/--primary:\s*var\(--color-accent\)/);
    expect(css).toMatch(/--destructive:\s*var\(--color-missable\)/);
  });

  it("exposes the semantic tokens as utilities via @theme inline", () => {
    expect(css).toContain("@theme inline");
    expect(css).toMatch(/--color-background:\s*var\(--background\)/);
  });

  it("keeps dark as a media query with no .dark class", () => {
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(cssNoComments).not.toContain(".dark");
    // No `.dark`-targeting custom variant either — dark: must stay media-based.
    expect(cssNoComments).not.toContain("@custom-variant dark");
  });
});
