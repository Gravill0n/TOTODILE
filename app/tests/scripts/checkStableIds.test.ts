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
import { checkStableIds } from "../../scripts/checkStableIdsCore.ts";
import { SCHEMA_VERSION } from "../../src/schema";
import {
  validDataLayer,
  validGuide,
  validLibrary,
  validSpineLayer,
} from "../schema/helpers";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const GUIDE = "guides/fictional-quest";

function writeTree(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "totodile-stableids-"));
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

function approvedSpineBaseline(contentHash?: string): string {
  const root = writeTree({
    [`${GUIDE}/layers/spine.json`]: validSpineLayer(),
  });
  const digest = `sha256:${createHash("sha256")
    .update(readFileSync(join(root, GUIDE, "layers/spine.json")))
    .digest("hex")}`;
  writeFileSync(
    join(root, GUIDE, "approvals.json"),
    JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      guideId: "fictional-quest",
      layers: [
        {
          id: "spine",
          kind: "spine",
          artifact: "layers/spine.json",
          report: { rowCount: 2, anomalies: [], flaggedItemIds: [] },
          contentHash: contentHash ?? digest,
          status: "approved",
          approval: { date: "2026-06-12T10:00:00Z", verdict: "approved" },
          spotChecks: [],
        },
      ],
    }),
  );
  return root;
}

function spineWithoutStep2() {
  const layer = validSpineLayer();
  const visit = layer.chapters[0]?.visits[0];
  if (visit) visit.steps = visit.steps.slice(0, 1);
  return layer;
}

function messagesOf(baseline: string, current: string): string {
  return checkStableIds(baseline, current, "fictional-quest")
    .findings.map((f) => `[${f.file}] ${f.message}`)
    .join("\n");
}

describe("checkStableIds", () => {
  it("hard-fails when a recompile drops an approved step ID (§6.8)", () => {
    const baseline = approvedSpineBaseline();
    const current = writeTree({
      [`${GUIDE}/layers/spine.json`]: spineWithoutStep2(),
    });
    const report = checkStableIds(baseline, current, "fictional-quest");
    expect(report.ok).toBe(false);
    expect(messagesOf(baseline, current)).toContain(
      'stable ID "fictional-quest:c1:s2" is gone from the recompile',
    );
  });

  it("hard-fails on a re-spelled ID — a rename is a drop plus an add", () => {
    const baseline = approvedSpineBaseline();
    const layer = validSpineLayer();
    const step = layer.chapters[0]?.visits[0]?.steps[1];
    if (step) step.id = "fictional-quest:c1:s2-final";
    const current = writeTree({ [`${GUIDE}/layers/spine.json`]: layer });
    expect(messagesOf(baseline, current)).toContain(
      '"fictional-quest:c1:s2" is gone',
    );
  });

  it("passes when the recompile only adds new content", () => {
    const baseline = approvedSpineBaseline();
    const layer = validSpineLayer();
    const visit = layer.chapters[0]?.visits[0];
    visit?.steps.push({
      ...visit.steps[0],
      id: "fictional-quest:c1:s3",
      order: 2,
    } as never);
    const current = writeTree({ [`${GUIDE}/layers/spine.json`]: layer });
    const report = checkStableIds(baseline, current, "fictional-quest");
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("counts an ID preserved in guide.json even when layers are absent (and vice versa)", () => {
    const baseline = approvedSpineBaseline();
    const viaGuide = writeTree({ [`${GUIDE}/guide.json`]: validGuide() });
    expect(checkStableIds(baseline, viaGuide, "fictional-quest").ok).toBe(true);

    const viaLayer = writeTree({
      [`${GUIDE}/layers/spine.json`]: validSpineLayer(),
    });
    expect(checkStableIds(baseline, viaLayer, "fictional-quest").ok).toBe(true);
  });

  it("passes vacuously when the baseline has only draft layers", () => {
    const baseline = writeTree({
      [`${GUIDE}/layers/spine.json`]: validSpineLayer(),
      [`${GUIDE}/approvals.json`]: {
        schemaVersion: SCHEMA_VERSION,
        guideId: "fictional-quest",
        layers: [
          {
            id: "spine",
            kind: "spine",
            artifact: "layers/spine.json",
            report: { rowCount: 2, anomalies: [], flaggedItemIds: [] },
            contentHash: "sha256:irrelevant-for-drafts",
            status: "draft",
            spotChecks: [],
          },
        ],
      },
    });
    const current = writeTree({});
    const report = checkStableIds(baseline, current, "fictional-quest");
    expect(report.ok).toBe(true);
    expect(report.notes.join("\n")).toContain("nothing to protect yet");
  });

  it("protects a playable guide.json without approvals.json (the ML PiT shape)", () => {
    const baseline = writeTree({
      "library.json": validLibrary(),
      [`${GUIDE}/guide.json`]: validGuide(),
    });
    const intact = writeTree({ [`${GUIDE}/guide.json`]: validGuide() });
    expect(checkStableIds(baseline, intact, "fictional-quest").ok).toBe(true);

    const mutilated = validGuide();
    mutilated.widgets = mutilated.widgets.slice(1);
    const current = writeTree({ [`${GUIDE}/guide.json`]: mutilated });
    const report = checkStableIds(baseline, current, "fictional-quest");
    expect(report.ok).toBe(false);
    expect(messagesOf(baseline, current)).toContain(
      'stable ID "fictional-quest:w1" is gone',
    );
  });

  it("stays vacuous for an in-compilation guide without approvals", () => {
    const library = validLibrary();
    if (library.guides[0]) library.guides[0].status = "in-compilation";
    const baseline = writeTree({
      "library.json": library,
      [`${GUIDE}/guide.json`]: validGuide(),
    });
    const current = writeTree({});
    expect(checkStableIds(baseline, current, "fictional-quest").ok).toBe(true);
  });

  it("flags a baseline artifact that contradicts its approval hash (contract §5)", () => {
    const baseline = approvedSpineBaseline(`sha256:${"0".repeat(64)}`);
    const current = writeTree({
      [`${GUIDE}/layers/spine.json`]: validSpineLayer(),
    });
    expect(messagesOf(baseline, current)).toContain(
      "does not match the approval hash",
    );
  });

  it("fails listing every protected ID when the current tree is empty", () => {
    const baseline = approvedSpineBaseline();
    const current = writeTree({});
    const report = checkStableIds(baseline, current, "fictional-quest");
    expect(report.ok).toBe(false);
    const joined = messagesOf(baseline, current);
    for (const id of [
      "fictional-quest:c1",
      "fictional-quest:c1:s1",
      "fictional-quest:c1:s2",
    ]) {
      expect(joined).toContain(`"${id}" is gone`);
    }
  });

  it("skips an extract-data layer recorded as widget-pass in approvals (no crash, nothing to protect)", () => {
    // The extract-data layer (layers/data.json) has no layerKind of its own, so
    // the review flow records it as "widget-pass". It must not be parsed as a
    // widget (it is pass: "extract-data") — its IDs are local, §6.8-exempt.
    const baseline = writeTree({
      [`${GUIDE}/layers/spine.json`]: validSpineLayer(),
      [`${GUIDE}/layers/data.json`]: validDataLayer(),
    });
    const digest = (rel: string) =>
      `sha256:${createHash("sha256")
        .update(readFileSync(join(baseline, GUIDE, rel)))
        .digest("hex")}`;
    const report = { rowCount: 2, anomalies: [], flaggedItemIds: [] };
    const approval = { date: "2026-06-12T10:00:00Z", verdict: "approved" };
    writeFileSync(
      join(baseline, GUIDE, "approvals.json"),
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        guideId: "fictional-quest",
        layers: [
          {
            id: "spine",
            kind: "spine",
            artifact: "layers/spine.json",
            report,
            contentHash: digest("layers/spine.json"),
            status: "approved",
            approval,
            spotChecks: [],
          },
          {
            id: "data",
            kind: "widget-pass",
            artifact: "layers/data.json",
            report,
            contentHash: digest("layers/data.json"),
            status: "approved",
            approval,
            spotChecks: [],
          },
        ],
      }),
    );
    const current = writeTree({
      [`${GUIDE}/layers/spine.json`]: validSpineLayer(),
    });
    const result = checkStableIds(baseline, current, "fictional-quest");
    expect(result.findings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("flags an approved layer whose baseline artifact is missing", () => {
    const baseline = approvedSpineBaseline();
    rmSync(join(baseline, GUIDE, "layers/spine.json"));
    const current = writeTree({});
    expect(messagesOf(baseline, current)).toContain(
      'approved layer "spine" has no artifact in the baseline',
    );
  });
});
