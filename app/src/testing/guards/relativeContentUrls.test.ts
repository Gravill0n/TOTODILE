import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

// The Pages deploy serves the app under a subpath (§21.3: /TOTODILE/); hash
// routing plus relative content fetches make the Vite `base` env knob the only
// thing the deploy needs to set. An absolute content URL ("/guides/…",
// "/library.json") works in dev — where base is "/" and serveRepoContent
// answers at the root — and 404s only once deployed, so no other test would
// ever see it. Machine-enforce the invariant instead.
// Production source only: colocated tests and src/testing/ may do as they like.

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

const isProduction = (f: string) =>
  !/\.test\.tsx?$/.test(f) && !f.includes(`src${sep}testing${sep}`);

const files = walk("src").filter(isProduction);

const offenders = (pattern: RegExp) =>
  files.filter((f) => pattern.test(readFileSync(f, "utf8")));

describe("content URLs stay relative (§21.3 subpath deploy)", () => {
  it("production src never hardcodes an absolute content path", () => {
    expect(offenders(/["'`]\/(?:guides\/|library\.json)/)).toEqual([]);
  });

  it("production src never fetches a root-absolute URL", () => {
    expect(offenders(/fetch\(\s*["'`]\//)).toEqual([]);
  });
});
