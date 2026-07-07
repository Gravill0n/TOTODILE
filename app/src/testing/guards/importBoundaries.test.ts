import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

// PRD §20.1 (amended 2026-07-07): the bulletproof-react dependency direction —
// shared (components, lib, types, schema) → features → app — machine-enforced.
// Production source only: colocated tests and src/testing/ may reach anywhere.
//
// Rules, each its own `it` below:
//   1. a feature never imports another feature
//   2. shared folders never import features or app
//   3. src/app/** is imported by nothing but src/main.tsx
//   4. relative imports never leave their scope (cross-folder goes through @/)
//   5. schema/ imports nothing from src outside schema/ (the contract is a leaf)
//   6. @retroachievements/api appears only under features/sync (§9.1)

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

// "app", "features/spine", "components", "lib", "types", "schema", or "main"
// for the src-root entry files (main.tsx, index.css side).
function scopeOf(srcRelative: string): string {
  const segments = srcRelative.split(sep);
  if (segments.length === 1) return "main";
  if (segments[0] === "features") return segments.slice(0, 2).join("/");
  return segments[0] ?? "";
}

type Edge = { file: string; specifier: string; from: string; to: string };

// Static + dynamic import specifiers. Biome keeps sources double-quoted, so
// a quote-bounded scan is exact here.
function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)].map(
    (m) => m[1] ?? "",
  );
}

const edges: Edge[] = files.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return importSpecifiers(source).flatMap((specifier) => {
    let targetSrcRelative: string;
    if (specifier.startsWith("@/")) {
      targetSrcRelative = specifier.slice(2).split("/").join(sep);
    } else if (specifier.startsWith(".")) {
      const target = resolve(dirname(file), specifier);
      targetSrcRelative = relative("src", target);
    } else {
      return []; // bare package specifier — rule 6 handles the RA client
    }
    return [
      {
        file,
        specifier,
        from: scopeOf(relative("src", resolve(file))),
        to: scopeOf(targetSrcRelative),
      },
    ];
  });
});

const shared = new Set(["components", "lib", "types", "schema"]);
const offenderList = (bad: Edge[]) =>
  bad.map((e) => `${e.file} → ${e.specifier}`);

describe("import boundaries (PRD §20.1)", () => {
  it("no feature imports another feature", () => {
    const bad = edges.filter(
      (e) =>
        e.from.startsWith("features/") &&
        e.to.startsWith("features/") &&
        e.from !== e.to,
    );
    expect(offenderList(bad)).toEqual([]);
  });

  it("shared folders import neither features nor app", () => {
    const bad = edges.filter(
      (e) =>
        shared.has(e.from) && (e.to.startsWith("features/") || e.to === "app"),
    );
    expect(offenderList(bad)).toEqual([]);
  });

  it("src/app is imported only by main.tsx", () => {
    const bad = edges.filter(
      (e) => e.to === "app" && e.from !== "app" && e.from !== "main",
    );
    expect(offenderList(bad)).toEqual([]);
  });

  it("relative imports stay inside their scope — cross-folder goes through @/", () => {
    const bad = edges.filter(
      (e) => e.specifier.startsWith(".") && e.from !== e.to,
    );
    expect(offenderList(bad)).toEqual([]);
  });

  it("schema is a leaf — it imports nothing else from src", () => {
    const bad = edges.filter((e) => e.from === "schema" && e.to !== "schema");
    expect(offenderList(bad)).toEqual([]);
  });

  it("the RA client package stays inside features/sync (§9.1)", () => {
    const bad = files.filter(
      (f) =>
        !f.startsWith(join("src", "features", "sync")) &&
        readFileSync(f, "utf8").includes("@retroachievements/api"),
    );
    expect(bad).toEqual([]);
  });
});
