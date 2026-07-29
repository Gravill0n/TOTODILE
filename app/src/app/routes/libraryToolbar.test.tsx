// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  writeSlot,
} from "@/features/progress/progressStore";
import { validLibrary } from "@/testing/helpers";
import { renderAppAt, stubGuideContent } from "@/testing/renderRoute";

// S1 became an index rather than a wall of covers, so it needs the index
// affordances: find a guide by name, narrow to what is playable or planned,
// and reorder. All three are view state — nothing here is persisted (§14.3
// has no room for stored UI preferences on the library).

const PLAYABLE = ["fictional-quest", "ghost-quest"];

function libraryOfThree() {
  const library = validLibrary();
  const first = library.guides[0];
  library.guides = [
    first,
    {
      ...first,
      id: "ghost-quest",
      title: "Ghost Quest — 100% guide",
      game: "Ghost Quest",
      platform: "Nintendo DS",
    },
    {
      ...first,
      id: "future-quest",
      title: "Future Quest — planned",
      game: "Future Quest",
      status: "planned",
    },
  ] as never;
  return library;
}

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

const titles = () =>
  screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

async function renderLibrary() {
  stubGuideContent({ library: libraryOfThree(), playableSlugs: PLAYABLE });
  renderAppAt("/");
  await screen.findByText("Fictional Quest — 100% guide");
}

describe("library header", () => {
  it("names the app over the screen and tallies what the library holds", async () => {
    await renderLibrary();
    expect(screen.getByText("TOTODILE")).toBeDefined();
    // The heading stays "Library" alone — the eyebrow is its own element.
    expect(screen.getByRole("heading", { name: "Library" })).toBeDefined();
    expect(screen.getByText("2 playable · 1 planned")).toBeDefined();
  });
});

describe("library toolbar", () => {
  it("searches title, game and platform", async () => {
    await renderLibrary();
    const search = screen.getByLabelText("Search guides");

    fireEvent.change(search, { target: { value: "ghost" } });
    await waitFor(() => expect(titles()).toEqual(["Ghost Quest — 100% guide"]));

    // Platform matches too, and matching is case-insensitive.
    fireEvent.change(search, { target: { value: "nintendo" } });
    await waitFor(() => expect(titles()).toEqual(["Ghost Quest — 100% guide"]));
  });

  it("narrows to playable or to planned", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("radio", { name: "Planned" }));
    await waitFor(() => expect(titles()).toEqual(["Future Quest — planned"]));

    fireEvent.click(screen.getByRole("radio", { name: "Playable" }));
    await waitFor(() => {
      expect(titles()).toEqual([
        "Fictional Quest — 100% guide",
        "Ghost Quest — 100% guide",
      ]);
    });
  });

  it("sorts by activity, title and completion", async () => {
    await writeSlot({
      ...emptySlot("ghost-quest"),
      stats: { stepsDone: 9, stepsTotal: 10, currentChapterTitle: null },
      lastActivityAt: "2026-07-01T10:00:00Z",
    });
    await writeSlot({
      ...emptySlot("fictional-quest"),
      stats: { stepsDone: 1, stepsTotal: 10, currentChapterTitle: null },
      lastActivityAt: "2026-07-02T10:00:00Z",
    });
    await renderLibrary();

    // Activity is the default: most recently touched first.
    expect(titles().slice(0, 2)).toEqual([
      "Fictional Quest — 100% guide",
      "Ghost Quest — 100% guide",
    ]);

    fireEvent.click(screen.getByRole("radio", { name: "Title" }));
    await waitFor(() => {
      expect(titles().slice(0, 2)).toEqual([
        "Fictional Quest — 100% guide",
        "Ghost Quest — 100% guide",
      ]);
    });

    fireEvent.click(screen.getByRole("radio", { name: "Completion" }));
    await waitFor(() => {
      expect(titles().slice(0, 2)).toEqual([
        "Ghost Quest — 100% guide",
        "Fictional Quest — 100% guide",
      ]);
    });
  });

  it("says so when nothing matches, per section", async () => {
    await renderLibrary();
    fireEvent.change(screen.getByLabelText("Search guides"), {
      target: { value: "zzz" },
    });

    expect(await screen.findByText("No playable guides match.")).toBeDefined();
    expect(screen.getByText("Nothing in the backlog matches.")).toBeDefined();
  });

  it("keeps the toolbar out of the URL and out of storage", async () => {
    await renderLibrary();
    fireEvent.change(screen.getByLabelText("Search guides"), {
      target: { value: "ghost" },
    });
    await waitFor(() => expect(titles()).toEqual(["Ghost Quest — 100% guide"]));
    expect(localStorage.length).toBe(0);
  });
});
