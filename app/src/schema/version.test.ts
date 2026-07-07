import { describe, expect, it } from "vitest";
import {
  expectParses,
  expectRejects,
  validGuide,
  validStep,
} from "@/testing/helpers";
import {
  guideFile,
  SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  schemaVersion,
  step,
} from "../../src/schema";

describe("schema versioning (§8.2, §18.3)", () => {
  it("the emitted version is always among the readable ones", () => {
    expect(SUPPORTED_SCHEMA_VERSIONS).toContain(SCHEMA_VERSION);
  });

  it("accepts every supported version on a guide file", () => {
    for (const version of SUPPORTED_SCHEMA_VERSIONS) {
      expectParses(guideFile, { ...validGuide(), schemaVersion: version });
    }
  });

  it("rejects an unsupported version", () => {
    expectRejects(schemaVersion, 999);
    expectRejects(guideFile, { ...validGuide(), schemaVersion: 999 });
  });
});

describe("unknown-field tolerance (§9.2 — data may run ahead of renderers)", () => {
  it("parses and strips an unknown field on a guide file", () => {
    const parsed = guideFile.parse({ ...validGuide(), futureField: "ignored" });
    expect("futureField" in parsed).toBe(false);
  });

  it("parses and strips an unknown field on a step", () => {
    const parsed = step.parse({ ...validStep(), videoClip: "intro.mp4" });
    expect("videoClip" in parsed).toBe(false);
  });
});
