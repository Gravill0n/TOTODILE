import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  validDataLayer,
  validPassReport,
  validRaMapping,
  validSpineLayer,
  validWidgetLayer,
} from "@/testing/helpers";
import { buildLayersManifest } from "../../scripts/buildLayersManifestCore.ts";
import { layersManifest } from "../../src/schema";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function writeTree(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "totodile-manifest-"));
  roots.push(root);
  for (const [relPath, content] of Object.entries(files)) {
    const path = join(root, relPath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      typeof content === "string" ? content : JSON.stringify(content),
    );
  }
  return root;
}

function sha256Of(root: string, relPath: string): string {
  return createHash("sha256")
    .update(readFileSync(join(root, "guides/fictional-quest", relPath)))
    .digest("hex");
}

function layersTree() {
  return {
    "guides/fictional-quest/layers/data.json": validDataLayer(),
    "guides/fictional-quest/layers/data.report.json": validPassReport(
      "data",
      "extract-data",
    ),
    "guides/fictional-quest/layers/spine.json": validSpineLayer(),
    "guides/fictional-quest/layers/spine.report.json": validPassReport("spine"),
    "guides/fictional-quest/layers/widget-w1.json": validWidgetLayer(1),
    "guides/fictional-quest/layers/widget-w1.report.json": validPassReport(
      "widget-w1",
      "widget",
    ),
    "guides/fictional-quest/layers/ra-mapping.json": validRaMapping(),
    "guides/fictional-quest/layers/ra-mapping.report.json":
      validPassReport("ra-mapping"),
  };
}

describe("buildLayersManifest", () => {
  it("derives entries from the reviewable artifacts on disk, skipping data", () => {
    const root = writeTree(layersTree());
    const report = buildLayersManifest(root, "fictional-quest");

    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.manifest?.entries.map((e) => e.id)).toEqual([
      "spine",
      "widget-w1",
      "ra-mapping",
    ]);
  });

  it("records each artifact's exact-bytes digest", () => {
    const root = writeTree(layersTree());
    const report = buildLayersManifest(root, "fictional-quest");

    const byId = new Map(report.manifest?.entries.map((e) => [e.id, e]));
    expect(byId.get("spine")?.sha256).toBe(sha256Of(root, "layers/spine.json"));
    expect(byId.get("widget-w1")?.sha256).toBe(
      sha256Of(root, "layers/widget-w1.json"),
    );
  });

  it("copies widget metadata from the parsed widget artifact", () => {
    const root = writeTree(layersTree());
    const report = buildLayersManifest(root, "fictional-quest");

    const entry = report.manifest?.entries.find((e) => e.id === "widget-w1");
    expect(entry?.widget).toEqual({
      deckPosition: 0,
      scope: { kind: "global" },
      title: "Treasure checklist",
    });
  });

  it("flags an artifact with no report and writes nothing", () => {
    const tree = layersTree();
    delete (tree as Record<string, unknown>)[
      "guides/fictional-quest/layers/spine.report.json"
    ];
    const root = writeTree(tree);
    const report = buildLayersManifest(root, "fictional-quest", {
      write: true,
    });

    expect(report.ok).toBe(false);
    expect(report.findings.map((f) => f.message).join("\n")).toContain(
      "spine.report.json",
    );
    expect(report.wrote).toEqual([]);
  });

  it("fails on a guide with no layers directory", () => {
    const root = writeTree({ "guides/fictional-quest/sources.json": "{}" });
    const report = buildLayersManifest(root, "fictional-quest");
    expect(report.ok).toBe(false);
  });

  it("writes a schema-valid layers/manifest.json when asked", () => {
    const root = writeTree(layersTree());
    const report = buildLayersManifest(root, "fictional-quest", {
      write: true,
    });

    expect(report.wrote).toEqual(["layers/manifest.json"]);
    const written = JSON.parse(
      readFileSync(
        join(root, "guides/fictional-quest/layers/manifest.json"),
        "utf8",
      ),
    );
    expect(layersManifest.safeParse(written).success).toBe(true);
  });
});
