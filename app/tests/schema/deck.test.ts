import { describe, it } from "vitest";
import { genreDeck } from "../../src/schema";
import { expectParses, expectRejects, validDeck } from "./helpers";

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
});
