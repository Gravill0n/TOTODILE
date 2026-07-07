import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectContentManifestEntries } from "./contentPrecache.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

// Keys are paths relative to the temp repo root; values are file contents.
function writeTree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "totodile-precache-"));
  roots.push(root);
  for (const [relPath, content] of Object.entries(files)) {
    const path = join(root, relPath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

describe("collectContentManifestEntries", () => {
  it("lists library.json plus each guide's guide.json and images", () => {
    const root = writeTree({
      "library.json": "{}",
      "guides/mlpit/guide.json": "{}",
      "guides/mlpit/images/boss.png": "png-bytes",
      "guides/mlpit/images/maps/town.webp": "webp-bytes",
    });
    const urls = collectContentManifestEntries(root).map((e) => e.url);
    expect(urls).toEqual([
      "guides/mlpit/guide.json",
      "guides/mlpit/images/boss.png",
      "guides/mlpit/images/maps/town.webp",
      "library.json",
    ]);
  });

  it("includes every player-fetched JSON so offline playability works", () => {
    const root = writeTree({
      "library.json": "{}",
      "guides/mlpit/guide.json": "{}",
      "guides/mlpit/approvals.json": "{}",
      "guides/mlpit/ra-mapping.json": "{}",
      "guides/mlpit/layers/manifest.json": "{}",
      "guides/mlpit/layers/qa.report.json": "{}",
    });
    const urls = collectContentManifestEntries(root).map((e) => e.url);
    expect(urls).toEqual([
      "guides/mlpit/approvals.json",
      "guides/mlpit/guide.json",
      "guides/mlpit/layers/manifest.json",
      "guides/mlpit/layers/qa.report.json",
      "guides/mlpit/ra-mapping.json",
      "library.json",
    ]);
  });

  it("excludes editor-only files the play routes never fetch", () => {
    const root = writeTree({
      "library.json": "{}",
      "guides/mlpit/guide.json": "{}",
      "guides/mlpit/sources.json": "{}",
      "guides/mlpit/deck.json": "{}",
      "guides/mlpit/layers/spine.json": "{}",
      "guides/mlpit/layers/spine.report.json": "{}",
      "guides/mlpit/layers/translation-report.md": "notes",
    });
    const urls = collectContentManifestEntries(root).map((e) => e.url);
    expect(urls).toEqual(["guides/mlpit/guide.json", "library.json"]);
  });

  it("returns an empty list when the repo has no content yet", () => {
    const root = writeTree({});
    expect(collectContentManifestEntries(root)).toEqual([]);
  });

  it("revision is stable for identical content and changes with it", () => {
    const before = writeTree({ "library.json": '{"v":1}' });
    const same = writeTree({ "library.json": '{"v":1}' });
    const after = writeTree({ "library.json": '{"v":2}' });
    const revisionOf = (root: string) =>
      collectContentManifestEntries(root)[0]?.revision;
    expect(revisionOf(before)).toBe(revisionOf(same));
    expect(revisionOf(before)).not.toBe(revisionOf(after));
  });
});
