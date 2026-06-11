import { describe, it } from "vitest";
import { sourceManifest } from "../../src/schema";
import { expectParses, expectRejects, validSources } from "./helpers";

describe("sourceManifest", () => {
  it("parses a valid manifest", () => {
    expectParses(sourceManifest, validSources());
  });

  it("parses an offline source without a URL", () => {
    const value = validSources();
    expectParses(sourceManifest, {
      ...value,
      sources: [{ ...value.sources[0], url: undefined, type: "manual" }],
    });
  });

  it("rejects an empty manifest — every guide needs ≥1 source", () => {
    expectRejects(sourceManifest, { ...validSources(), sources: [] });
  });

  it("rejects an unknown source type", () => {
    const value = validSources();
    expectRejects(sourceManifest, {
      ...value,
      sources: [{ ...value.sources[0], type: "hearsay" }],
    });
  });

  it("rejects a malformed retrieval date", () => {
    const value = validSources();
    expectRejects(sourceManifest, {
      ...value,
      sources: [{ ...value.sources[0], retrievedAt: "11/06/2026" }],
    });
  });

  it("rejects a malformed URL", () => {
    const value = validSources();
    expectRejects(sourceManifest, {
      ...value,
      sources: [{ ...value.sources[0], url: "not a url" }],
    });
  });

  it("rejects duplicate source IDs", () => {
    const value = validSources();
    expectRejects(sourceManifest, {
      ...value,
      sources: [...value.sources, ...value.sources],
    });
  });
});
