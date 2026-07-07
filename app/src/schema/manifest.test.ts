import { describe, it } from "vitest";
import { layersManifest } from "@/schema";
import {
  expectParses,
  expectRejects,
  validManifest,
  validManifestEntry,
} from "@/testing/helpers";

describe("layersManifest", () => {
  it("parses a valid manifest (spine + widget + ra-mapping)", () => {
    expectParses(layersManifest, validManifest());
  });

  it("parses an empty entries list (guide before its spine pass)", () => {
    expectParses(layersManifest, { ...validManifest(), entries: [] });
  });

  it("rejects duplicate entry IDs", () => {
    const manifest = validManifest();
    manifest.entries.push(validManifestEntry("spine"));
    expectRejects(layersManifest, manifest);
  });

  it("rejects an ID that is not a reviewable layer (data, qa …)", () => {
    const manifest = validManifest();
    manifest.entries.push({ ...validManifestEntry("spine"), id: "data" });
    expectRejects(layersManifest, manifest);
  });

  it("rejects a kind that contradicts the ID", () => {
    const manifest = validManifest();
    const entry = manifest.entries[0];
    if (entry) entry.kind = "ra-mapping";
    expectRejects(layersManifest, manifest);
  });

  it("rejects a widget entry without widget metadata", () => {
    const manifest = validManifest();
    const entry = manifest.entries.find((e) => e.kind === "widget");
    if (entry && "widget" in entry)
      (entry as { widget?: unknown }).widget = undefined;
    expectRejects(layersManifest, manifest);
  });

  it("rejects widget metadata on a non-widget entry", () => {
    const manifest = validManifest();
    const spine = manifest.entries[0] as { widget?: unknown };
    spine.widget = {
      deckPosition: 0,
      scope: { kind: "global" },
      title: "Nope",
    };
    expectRejects(layersManifest, manifest);
  });

  it("rejects an artifact path that does not match the entry ID", () => {
    const manifest = validManifest();
    const entry = manifest.entries[0];
    if (entry) entry.artifact = "layers/other.json";
    expectRejects(layersManifest, manifest);
  });

  it("rejects a report path that does not match the entry ID", () => {
    const manifest = validManifest();
    const entry = manifest.entries[0];
    if (entry) entry.report = "layers/other.report.json";
    expectRejects(layersManifest, manifest);
  });

  it("rejects a malformed digest", () => {
    const manifest = validManifest();
    const entry = manifest.entries[0];
    if (entry) entry.sha256 = "not-a-digest";
    expectRejects(layersManifest, manifest);
  });

  it("rejects a negative deckPosition", () => {
    const manifest = validManifest();
    const entry = manifest.entries.find((e) => e.kind === "widget");
    if (entry?.widget) entry.widget.deckPosition = -1;
    expectRejects(layersManifest, manifest);
  });

  it("rejects a widget scope with an unknown kind", () => {
    const manifest = validManifest();
    const entry = manifest.entries.find((e) => e.kind === "widget");
    if (entry?.widget) entry.widget.scope = { kind: "galaxy" } as never;
    expectRejects(layersManifest, manifest);
  });
});
