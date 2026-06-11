import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateGuides } from "../../scripts/validateGuidesCore.ts";
import { guideFile, widgetType } from "../../src/schema";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "repo");

describe("fictional-quest fixture guide (§12.3)", () => {
  it("passes the validate-guides CI gate", () => {
    const report = validateGuides(fixtureRoot);
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.guidesChecked).toBe(1);
  });

  it("keeps its §12.3 shape: 2 chapters, ≥10 steps, all 7 primitives", () => {
    const guide = guideFile.parse(
      JSON.parse(
        readFileSync(
          join(fixtureRoot, "guides", "fictional-quest", "guide.json"),
          "utf8",
        ),
      ),
    );
    expect(guide.chapters).toHaveLength(2);
    const stepCount = guide.chapters.reduce((n, c) => n + c.steps.length, 0);
    expect(stepCount).toBeGreaterThanOrEqual(10);
    expect(new Set(guide.widgets.map((w) => w.type))).toEqual(
      new Set(widgetType.options),
    );
  });
});
