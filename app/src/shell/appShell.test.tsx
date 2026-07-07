// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  writeSlot,
} from "@/progress/progressStore";
import { setEditorMode } from "@/review/editorMode";
import { SCHEMA_VERSION } from "@/schema";
import { createAppRouter } from "@/shell/router";
import { readFixtureJson } from "@/testing/fixtureRepo";
import { validLayer, validLibrary } from "@/testing/helpers";

const fixtureGuide = readFixtureJson("guides/fictional-quest/guide.json");

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  setEditorMode(false);
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

function libraryWithTwoGuides() {
  const library = validLibrary();
  library.guides = [
    ...library.guides,
    {
      ...library.guides[0],
      id: "ghost-quest",
      title: "Ghost Quest — draft guide",
      game: "Ghost Quest",
      status: "in-compilation",
    },
  ] as never;
  return library;
}

// An all-approved approvals record makes a guide playable (FR-E5).
function approvedApprovals(slug: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: slug,
    layers: [{ ...validLayer("approved"), id: "layer-spine" }],
  };
}

// Playability is derived from approvals.json, so the stub must serve it.
// approvedSlugs are playable; every other guide reads as unfinished (404).
function stubContentFetch(
  library: unknown,
  approvedSlugs = ["fictional-quest"],
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) return Response.json(library);
      const approvals = url.match(/guides\/([^/]+)\/approvals\.json$/);
      if (approvals) {
        const slug = approvals[1] ?? "";
        return approvedSlugs.includes(slug)
          ? Response.json(approvedApprovals(slug))
          : new Response("not found", { status: 404 });
      }
      // Pipeline completion signal — playability checks only that it exists.
      const qa = url.match(/guides\/([^/]+)\/layers\/qa\.report\.json$/);
      if (qa) {
        return approvedSlugs.includes(qa[1] ?? "")
          ? new Response("{}", { status: 200 })
          : new Response("not found", { status: 404 });
      }
      if (url.endsWith("guides/fictional-quest/guide.json")) {
        return Response.json(fixtureGuide);
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

function renderAt(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<RouterProvider router={router} />);
}

describe("app shell", () => {
  it("renders only playable guides in player mode (FR-E5)", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/");
    expect(
      await screen.findByText("Fictional Quest — 100% guide"),
    ).toBeDefined();
    expect(screen.queryByText("Ghost Quest — draft guide")).toBeNull();
    expect(screen.getAllByText("en")).toHaveLength(1);
  });

  it("reveals unfinished guides with the unfinished treatment in editor mode (§9.3)", async () => {
    setEditorMode(true);
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/");
    expect(await screen.findByText("Ghost Quest — draft guide")).toBeDefined();
    expect(screen.getByText("unfinished")).toBeDefined();
    expect(screen.getByText("editor mode")).toBeDefined();
  });

  it("shows completion % and current chapter, sorted by last activity (FR-A3)", async () => {
    await writeSlot({
      ...emptySlot("fictional-quest"),
      stats: {
        stepsDone: 3,
        stepsTotal: 12,
        currentChapterTitle: "Chapter 1 — The Castle Gate",
      },
      lastActivityAt: "2026-06-11T10:00:00Z",
    });
    await writeSlot({
      ...emptySlot("ghost-quest"),
      stats: { stepsDone: 2, stepsTotal: 4, currentChapterTitle: null },
      lastActivityAt: "2026-06-12T10:00:00Z",
    });
    stubContentFetch(libraryWithTwoGuides(), [
      "fictional-quest",
      "ghost-quest",
    ]);
    renderAt("/");
    await screen.findByText("25%");
    expect(screen.getByText("Chapter 1 — The Castle Gate")).toBeDefined();
    const cardTitles = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(cardTitles).toEqual([
      "Ghost Quest — draft guide",
      "Fictional Quest — 100% guide",
    ]);
  });

  it("reaches the current step in one tap from a card (§7, FR-A4)", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/");
    const card = await screen.findByText("Fictional Quest — 100% guide");
    fireEvent.click(card.closest("a") ?? card);
    expect(await screen.findByText(/Talk to gatekeeper ×2/)).toBeDefined();
    expect(document.querySelector("[data-current]")).not.toBeNull();
  });

  it("renders the posture skeleton's bottom action bar on the guide screen", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/fictional-quest");
    await screen.findByText(/Talk to gatekeeper ×2/);
    expect(screen.getByTitle("Where am I")).toBeDefined();
    expect(screen.getByTitle("Sync")).toBeDefined();
  });

  it("opens the chapter sheet from the ☰ action", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/fictional-quest");
    await screen.findByText(/Talk to gatekeeper ×2/);
    fireEvent.click(screen.getByTitle("Chapters"));
    expect(
      await screen.findByRole("button", {
        name: "Chapter 2 — The Sunken Vault",
      }),
    ).toBeDefined();
  });

  it("opening an unfinished guide goes to its review lens, not play (§7)", async () => {
    setEditorMode(true);
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/ghost-quest");
    expect(await screen.findByText("Review lens — unfinished")).toBeDefined();
  });

  it("an unfinished guide is unreachable in player mode", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/ghost-quest");
    expect(
      await screen.findByRole("heading", { name: "Library" }),
    ).toBeDefined();
  });

  it("shows a visible broken state on a malformed manifest (§11.1)", async () => {
    stubContentFetch({ schemaVersion: 0, guides: [{ id: 42 }] });
    renderAt("/");
    expect(await screen.findByText("Something is broken")).toBeDefined();
  });

  it("shows a visible broken state when the manifest is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    renderAt("/");
    expect(await screen.findByText("Something is broken")).toBeDefined();
    expect(screen.getByText(/HTTP 404/)).toBeDefined();
  });

  it("shows a visible broken state when a playable guide's file is malformed (§11.1)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("library.json")) {
          return Response.json(libraryWithTwoGuides());
        }
        if (/guides\/[^/]+\/approvals\.json$/.test(url)) {
          return Response.json(approvedApprovals("fictional-quest"));
        }
        if (url.endsWith("guides/fictional-quest/layers/qa.report.json")) {
          return new Response("{}", { status: 200 });
        }
        if (url.endsWith("guides/fictional-quest/guide.json")) {
          return new Response("{ not json", { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
    renderAt("/guide/fictional-quest");
    expect(await screen.findByText("Something is broken")).toBeDefined();
  });

  it("shows not-found for a slug the library does not contain", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/does-not-exist");
    expect(await screen.findByText("Nothing here")).toBeDefined();
  });
});
