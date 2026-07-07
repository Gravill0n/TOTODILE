import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { dataLayer } from "@/schema";

// The guide-pass-extract-data skill ships a worked example of the layer it
// emits. This is the executable half of Task ED3's acceptance ("the example
// validates against dataLayer"): if the schema or the example drift apart, this
// fails. The example also has to exercise the real shape — multiple generic
// datasets including the `images` catalog that spine/widgets reuse.
const examplePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  ".claude",
  "skills",
  "guide-pass-extract-data",
  "examples",
  "data.sample.json",
);

const sample = dataLayer.parse(JSON.parse(readFileSync(examplePath, "utf8")));

describe("guide-pass-extract-data worked example (Task ED3)", () => {
  it("validates against the dataLayer schema", () => {
    expect(sample.pass).toBe("extract-data");
    expect(sample.schemaVersion).toBe(1);
  });

  it("carries at least two generic datasets", () => {
    expect(sample.datasets.length).toBeGreaterThanOrEqual(2);
  });

  it("includes an `images` catalog dataset for spine/widgets to reuse", () => {
    const images = sample.datasets.find((d) => d.id === "images");
    expect(images).toBeDefined();
    // Image records describe an available source asset.
    for (const record of images?.records ?? []) {
      expect(record.fields.path).toBeTruthy();
      expect(record.fields.kind).toBeTruthy();
    }
  });

  it("every record carries fields and at least one sourceRef", () => {
    const records = sample.datasets.flatMap((d) => d.records);
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      expect(Object.keys(record.fields).length).toBeGreaterThan(0);
      expect(record.sourceRefs.length).toBeGreaterThan(0);
    }
  });
});
