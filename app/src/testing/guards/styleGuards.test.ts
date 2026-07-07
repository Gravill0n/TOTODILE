import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// V1 — the token contract, enforced. Feature components style only through the
// paper palette and its shadcn aliases (§22.1); they carry no literal colours
// and no `dark:` variants (dark is automatic via the @media paper swap, §5.4).
//
// shadcn primitives under src/components/ui/ are owned third-party-style source:
// they legitimately ship `dark:` variants, which resolve through our media
// query (Tailwind v4's dark: defaults to prefers-color-scheme since we set no
// .dark custom variant). They are exempt from the dark: rule but not the hex
// rule. The palette's literal colours live only in index.css.
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const DARK_VARIANT = /\bdark:[a-z[]/;

function walk(dir: string, pred: (f: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full, pred);
    return /\.tsx$/.test(full) && pred(full) ? [full] : [];
  });
}

const isUi = (f: string) => f.includes("/components/ui/");
// Production source only — colocated tests and src/testing/ are exempt, as
// they were before test colocation moved them inside src/.
const isTest = (f: string) =>
  /\.test\.tsx?$/.test(f) || f.includes("src/testing/");
const featureFiles = walk("src", (f) => !isUi(f) && !isTest(f));
const allTsx = walk("src", (f) => !isTest(f));

describe("style guards (V1)", () => {
  it("no feature component carries a `dark:` variant", () => {
    const offenders = featureFiles.filter((f) =>
      DARK_VARIANT.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("no component (feature or ui) hard-codes a literal hex colour", () => {
    const offenders = allTsx.filter((f) => HEX.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
