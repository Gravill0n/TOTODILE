// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  writeSlot,
} from "@/features/progress/progressStore";
import { validLibrary, validRaMapping } from "@/testing/helpers";
import { renderAppAt, stubGuideContent } from "@/testing/renderRoute";

// S1 reads each guide's RA mapping so a row can show what share of the set is
// earned. The mapping is optional content (§6.5): a guide with no RA set must
// cost no request at all, and a set whose file is missing must not break the
// screen it is a detail on.

// fictional-quest carries raGameId 9000; quiet-quest carries none.
function libraryWithAndWithoutRa() {
  const library = validLibrary();
  const first = library.guides[0];
  library.guides = [
    first,
    {
      ...first,
      id: "quiet-quest",
      title: "Quiet Quest — no RA set",
      game: "Quiet Quest",
      raGameId: undefined,
    },
  ] as never;
  return library;
}

const bothPlayable = ["fictional-quest", "quiet-quest"];

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("library loader — RA mappings", () => {
  it("fetches a mapping only for guides that have an RA set", async () => {
    const fetches = stubGuideContent({
      library: libraryWithAndWithoutRa(),
      playableSlugs: bothPlayable,
    });
    renderAppAt("/");
    await screen.findByText("Quiet Quest — no RA set");

    expect(fetches.count("guides/fictional-quest/ra-mapping.json")).toBe(1);
    expect(fetches.count("guides/quiet-quest/ra-mapping.json")).toBe(0);
  });

  it("survives a guide whose mapping file is missing", async () => {
    stubGuideContent({
      library: libraryWithAndWithoutRa(),
      playableSlugs: bothPlayable,
      raMappings: {},
    });
    renderAppAt("/");

    expect(
      await screen.findByRole("heading", { name: "Library" }),
    ).toBeDefined();
    expect(screen.queryByText("Something is broken")).toBeNull();
  });

  it("counts achievements as earned when their mapped step is done", async () => {
    // validRaMapping has two entries; the first targets fictional-quest:c1:s1.
    await writeSlot({
      ...emptySlot("fictional-quest"),
      itemStates: {
        "fictional-quest:c1:s1": { state: "done", at: "2026-07-29T10:00:00Z" },
      },
    });
    stubGuideContent({
      library: libraryWithAndWithoutRa(),
      playableSlugs: bothPlayable,
      raMappings: { "fictional-quest": validRaMapping() },
    });
    renderAppAt("/");

    expect(await screen.findByText("1 / 2")).toBeDefined();
    // The guide with no RA set says so rather than showing a hollow count.
    expect(screen.getByText("no RA set")).toBeDefined();
  });
});
