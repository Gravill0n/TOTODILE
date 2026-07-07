import { describe, it } from "vitest";
import { expectParses, expectRejects, validDeck } from "@/testing/helpers";
import { genreDeck } from "../../src/schema";

describe("genreDeck", () => {
  it("parses a valid deck", () => {
    expectParses(genreDeck, validDeck());
  });

  it("rejects an empty deck", () => {
    expectRejects(genreDeck, { ...validDeck(), slots: [] });
  });

  it("rejects a slot with a primitive outside the closed set", () => {
    expectRejects(genreDeck, {
      ...validDeck(),
      slots: [
        { primitive: "kanban", defaultTitle: "Nope", defaultScope: "global" },
      ],
    });
  });

  it("accepts the location default scope (Workstream A)", () => {
    expectParses(genreDeck, {
      ...validDeck(),
      slots: [
        {
          primitive: "dataTable",
          defaultTitle: "Encounter table",
          defaultScope: "location",
        },
      ],
    });
  });

  it("rejects an unknown default scope", () => {
    expectRejects(genreDeck, {
      ...validDeck(),
      slots: [
        {
          primitive: "checklist",
          defaultTitle: "Key items",
          defaultScope: "step",
        },
      ],
    });
  });

  it("rejects the visit default scope — slots name a kind, but visit binds per instance only", () => {
    expectRejects(genreDeck, {
      ...validDeck(),
      slots: [
        {
          primitive: "dataTable",
          defaultTitle: "Encounter table",
          defaultScope: "visit",
        },
      ],
    });
  });
});
