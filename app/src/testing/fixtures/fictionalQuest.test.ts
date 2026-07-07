import { describe, expect, it } from "vitest";
import { guideFile, widgetType } from "@/schema";
import { fixtureRepoRoot, readFixtureJson } from "@/testing/fixtureRepo";
import { validateGuides } from "../../../scripts/validateGuidesCore.ts";

describe("fictional-quest fixture guide (§12.3)", () => {
  it("passes the validate-guides CI gate", () => {
    const report = validateGuides(fixtureRepoRoot);
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.guidesChecked).toBe(1);
  });

  it("keeps its §12.3 shape: 2 chapters, ≥10 steps, all 7 primitives", () => {
    const guide = guideFile.parse(
      readFixtureJson("guides/fictional-quest/guide.json"),
    );
    expect(guide.chapters).toHaveLength(2);
    const stepCount = guide.chapters.reduce(
      (n, c) => n + c.visits.reduce((m, v) => m + v.steps.length, 0),
      0,
    );
    expect(stepCount).toBeGreaterThanOrEqual(10);
    expect(new Set(guide.widgets.map((w) => w.type))).toEqual(
      new Set(widgetType.options),
    );
  });
});
