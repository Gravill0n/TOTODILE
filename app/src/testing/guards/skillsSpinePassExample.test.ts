import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { spineLayer } from "@/schema";

// The guide-pass-spine skill ships a worked example of the layer it emits. This
// test is the executable half of Task C1's acceptance ("skill instructions
// produce a layer that validates against the v1 spineLayer"): if the schema or
// the example drift apart, this fails. The example also has to actually exercise
// the v1 shape — locations, chapter→visit→step, keyword beats, and a revisit
// (two visits sharing one locationId) — not just parse.
const examplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  ".claude",
  "skills",
  "guide-pass-spine",
  "examples",
  "spine.sample.json",
);

const sample = spineLayer.parse(JSON.parse(readFileSync(examplePath, "utf8")));

describe("guide-pass-spine worked example (Task C1)", () => {
  it("validates against the v1 spineLayer schema", () => {
    expect(sample.pass).toBe("spine");
    expect(sample.schemaVersion).toBe(1);
  });

  it("declares a top-level locations registry", () => {
    expect(sample.locations.length).toBeGreaterThan(0);
  });

  it("nests steps under visits under chapters, with keyword beats", () => {
    const steps = sample.chapters.flatMap((c) =>
      c.visits.flatMap((v) => v.steps),
    );
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(step.keywords.length).toBeGreaterThan(0);
    }
  });

  it("every visit references a declared location (FK)", () => {
    const locationIds = new Set(sample.locations.map((l) => l.id));
    const visits = sample.chapters.flatMap((c) => c.visits);
    for (const visit of visits) {
      expect(locationIds.has(visit.locationId)).toBe(true);
    }
  });

  it("demonstrates a revisit — two visits sharing one locationId", () => {
    const visits = sample.chapters.flatMap((c) => c.visits);
    const byLocation = new Map<string, number>();
    for (const visit of visits) {
      byLocation.set(
        visit.locationId,
        (byLocation.get(visit.locationId) ?? 0) + 1,
      );
    }
    expect([...byLocation.values()].some((n) => n >= 2)).toBe(true);
  });
});
