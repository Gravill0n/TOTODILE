import { createHash } from "node:crypto";
import {
  existsSync,
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
  validMatrix,
  validPassReport,
  validRaMapping,
  validSources,
  validSpineLayer,
  validWidgetLayer,
} from "@/testing/helpers";
import { assembleGuide } from "./assembleGuideCore.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const GUIDE_DIR = "guides/fictional-quest";

function writeTree(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "totodile-assemble-"));
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

function shaOf(root: string, relToGuide: string): string {
  return createHash("sha256")
    .update(readFileSync(join(root, GUIDE_DIR, relToGuide)))
    .digest("hex");
}

function happyLayers() {
  return {
    [`${GUIDE_DIR}/sources.json`]: validSources(),
    [`${GUIDE_DIR}/layers/spine.json`]: validSpineLayer(),
    [`${GUIDE_DIR}/layers/widget-w1.json`]: validWidgetLayer(1),
    [`${GUIDE_DIR}/layers/widget-w2.json`]: {
      ...validWidgetLayer(1),
      widget: validMatrix(2),
    },
    [`${GUIDE_DIR}/layers/ra-mapping.json`]: validRaMapping(),
  };
}

function messagesOf(root: string): string {
  return assembleGuide(root, "fictional-quest")
    .findings.map((f) => `[${f.file}] ${f.message}`)
    .join("\n");
}

describe("assembleGuide", () => {
  it("merges spine + widget layers into a valid guide.json, widgets in deck order", () => {
    const root = writeTree(happyLayers());
    const report = assembleGuide(root, "fictional-quest", { write: true });
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.wrote).toEqual(["guide.json", "ra-mapping.json"]);

    const guide = JSON.parse(
      readFileSync(join(root, GUIDE_DIR, "guide.json"), "utf8"),
    );
    expect(guide.guideId).toBe("fictional-quest");
    expect(guide.chapters).toEqual(validSpineLayer().chapters);
    expect(guide.widgets.map((w: { id: string }) => w.id)).toEqual([
      "fictional-quest:w1",
      "fictional-quest:w2",
    ]);
    const mapping = JSON.parse(
      readFileSync(join(root, GUIDE_DIR, "ra-mapping.json"), "utf8"),
    );
    expect(mapping).toEqual(validRaMapping());
  });

  it("writes nothing on a dry run", () => {
    const root = writeTree(happyLayers());
    const report = assembleGuide(root, "fictional-quest", { write: false });
    expect(report.ok).toBe(true);
    expect(report.wrote).toEqual([]);
    expect(existsSync(join(root, GUIDE_DIR, "guide.json"))).toBe(false);
  });

  it("treats the ra-mapping layer as optional", () => {
    const { [`${GUIDE_DIR}/layers/ra-mapping.json`]: _mapping, ...tree } =
      happyLayers();
    const report = assembleGuide(writeTree(tree), "fictional-quest", {
      write: true,
    });
    expect(report.ok).toBe(true);
    expect(report.wrote).toEqual(["guide.json"]);
  });

  it("verifies report input digests and refuses stale layers (contract §6)", () => {
    const root = writeTree(happyLayers());
    const goodReport = {
      ...validPassReport("spine"),
      inputs: [{ file: "sources.json", sha256: shaOf(root, "sources.json") }],
    };
    writeFileSync(
      join(root, GUIDE_DIR, "layers/spine.report.json"),
      JSON.stringify(goodReport),
    );
    expect(assembleGuide(root, "fictional-quest").ok).toBe(true);

    // Sources change after the spine pass ran: its recorded digest no longer
    // matches, so assembly must refuse until the pass re-runs.
    writeFileSync(
      join(root, GUIDE_DIR, "sources.json"),
      JSON.stringify({ ...validSources(), edited: true }),
    );
    const stale = assembleGuide(root, "fictional-quest", { write: true });
    expect(stale.ok).toBe(false);
    expect(stale.wrote).toEqual([]);
    expect(stale.findings.map((f) => f.message).join("\n")).toContain(
      'input "sources.json" changed since the spine pass ran',
    );
    expect(existsSync(join(root, GUIDE_DIR, "guide.json"))).toBe(false);
  });

  it("refuses an input that no longer exists", () => {
    const root = writeTree({
      ...happyLayers(),
      [`${GUIDE_DIR}/layers/spine.report.json`]: {
        ...validPassReport("spine"),
        inputs: [{ file: "layers/ghost.json", sha256: "ab".repeat(32) }],
      },
    });
    expect(messagesOf(root)).toContain(
      'input "layers/ghost.json" no longer exists',
    );
  });

  it("refuses duplicate checkable IDs across spine and widget layers", () => {
    const layer = validWidgetLayer(1);
    layer.widget.rows = [
      { ...layer.widget.rows[0], itemId: "fictional-quest:c1:s1" },
    ] as never;
    const root = writeTree({
      ...happyLayers(),
      [`${GUIDE_DIR}/layers/widget-w1.json`]: layer,
    });
    const report = assembleGuide(root, "fictional-quest", { write: true });
    expect(report.ok).toBe(false);
    expect(report.findings.map((f) => f.message).join("\n")).toContain(
      "not unique across steps and widget items",
    );
    expect(existsSync(join(root, GUIDE_DIR, "guide.json"))).toBe(false);
  });

  it("requires the spine layer", () => {
    const { [`${GUIDE_DIR}/layers/spine.json`]: _spine, ...tree } =
      happyLayers();
    const report = assembleGuide(writeTree(tree), "fictional-quest");
    expect(report.ok).toBe(false);
    expect(report.findings.map((f) => f.file)).toContain("layers/spine.json");
  });

  it("reports a missing layers directory plainly", () => {
    const root = writeTree({ [`${GUIDE_DIR}/sources.json`]: validSources() });
    expect(messagesOf(root)).toContain("no layers/ directory");
  });
});
