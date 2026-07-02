import { describe, it } from "vitest";
import { libraryManifest } from "../../src/schema";
import { expectParses, expectRejects, validLibrary } from "./helpers";

describe("libraryManifest", () => {
  it("parses a valid library", () => {
    expectParses(libraryManifest, validLibrary());
  });

  it("parses an entry without an RA game ID (no RA set)", () => {
    const value = validLibrary();
    const { raGameId, ...entry } = value.guides[0] ?? {};
    expectParses(libraryManifest, { ...value, guides: [entry] });
  });

  it("parses a planned entry (backlog — no compiled content yet)", () => {
    const value = validLibrary();
    expectParses(libraryManifest, {
      ...value,
      guides: [{ ...value.guides[0], status: "planned" }],
    });
  });

  it("rejects an unknown status", () => {
    const value = validLibrary();
    expectRejects(libraryManifest, {
      ...value,
      guides: [{ ...value.guides[0], status: "abandoned" }],
    });
  });

  it("rejects an unsupported content language", () => {
    const value = validLibrary();
    expectRejects(libraryManifest, {
      ...value,
      guides: [{ ...value.guides[0], language: "de" }],
    });
  });

  it("rejects duplicate guide IDs", () => {
    const value = validLibrary();
    expectRejects(libraryManifest, {
      ...value,
      guides: [...value.guides, ...value.guides],
    });
  });

  it("rejects a non-positive RA game ID", () => {
    const value = validLibrary();
    expectRejects(libraryManifest, {
      ...value,
      guides: [{ ...value.guides[0], raGameId: 0 }],
    });
  });
});
