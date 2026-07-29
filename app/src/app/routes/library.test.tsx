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

describe("guide row", () => {
  it("carries the numbers a completionist opens the app for", async () => {
    await writeSlot({
      ...emptySlot("fictional-quest"),
      itemStates: {
        "fictional-quest:c1:s1": { state: "done", at: "2026-07-29T10:00:00Z" },
      },
      stats: {
        stepsDone: 3,
        stepsTotal: 12,
        currentChapterTitle: "Chapter 1 — The Castle Gate",
      },
      lastActivityAt: "2026-06-11T10:00:00Z",
    });
    stubGuideContent();
    renderAppAt("/");
    await screen.findByText("Fictional Quest — 100% guide");

    expect(screen.getByText("3 / 12")).toBeDefined();
    expect(screen.getByText("1 / 2")).toBeDefined();
    expect(screen.getByText("2026-06-11")).toBeDefined();
    // The percentage is its own node, not glued to a label.
    expect(screen.getByText("25%")).toBeDefined();
    // "Next up —" and the chapter are separate elements, so the chapter title
    // is findable on its own.
    expect(screen.getByText("Next up —")).toBeDefined();
    expect(screen.getByText("Chapter 1 — The Castle Gate")).toBeDefined();
  });

  it("colours the row the way Library.dc.html does", async () => {
    await writeSlot({
      ...emptySlot("fictional-quest"),
      stats: { stepsDone: 3, stepsTotal: 12, currentChapterTitle: null },
      lastActivityAt: "2026-06-11T10:00:00Z",
    });
    stubGuideContent({ raMappings: {} });
    renderAppAt("/");
    await screen.findByText("Fictional Quest — 100% guide");

    // The completion figure is the one number on the row worth the accent.
    expect(screen.getByText("25%").className).toContain("text-primary");
    // Bar tracks are a surface, not a tint of the fill.
    expect(
      document.querySelector('[data-slot="progress"]')?.className,
    ).toContain("bg-paper-dim");
    // A figure the guide does not have reads soft; one it does reads full.
    expect(screen.getByText("no RA set").className).toContain("text-ink-soft");
    expect(screen.getByText("3 / 12").className).not.toContain("text-ink-soft");
    expect(screen.getByText("2026-06-11").className).toContain("text-ink-soft");
  });

  it("says a guide has never been opened rather than showing zeroes", async () => {
    stubGuideContent();
    renderAppAt("/");
    await screen.findByText("Fictional Quest — 100% guide");
    expect(screen.getByText("Not started")).toBeDefined();
  });

  it("keeps planned entries out of the playable rows entirely", async () => {
    const library = validLibrary();
    library.guides = [
      library.guides[0],
      {
        ...library.guides[0],
        id: "future-quest",
        title: "Future Quest — planned",
        game: "Future Quest",
        status: "planned",
      },
      {
        ...library.guides[0],
        id: "quiet-future",
        title: "Quiet Future — planned",
        game: "Quiet Future",
        status: "planned",
        raGameId: undefined,
      },
    ] as never;
    stubGuideContent({ library });
    renderAppAt("/");

    const backlogTitle = await screen.findByText("Future Quest — planned");
    // A backlog entry has no build to open and no progress to report.
    expect(backlogTitle.closest("a")).toBeNull();
    expect(backlogTitle.closest('[class*="opacity-"]')).not.toBeNull();
    expect(screen.getByText("Backlog")).toBeDefined();
    expect(screen.getByText("Planned — not compiled yet")).toBeDefined();
    // The RA-set chip marks which backlog entries already have a set mapped.
    expect(screen.getAllByText("RA set")).toHaveLength(1);
    // Only the playable row carries a stats column.
    expect(screen.getAllByText("Steps")).toHaveLength(1);
  });

  it("renders the cover when there is one and a placeholder when there is not", async () => {
    const library = validLibrary();
    library.guides = [{ ...library.guides[0], cover: undefined }] as never;
    stubGuideContent({ library });
    renderAppAt("/");
    await screen.findByText("Fictional Quest — 100% guide");
    // No cover in the manifest means no broken image request.
    expect(screen.queryByRole("img")).toBeNull();
  });
});
