// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "../../src/progress/progressStore";
import { SCHEMA_VERSION } from "../../src/schema";
import { createAppRouter } from "../../src/shell/router";
import { validLayer, validLibrary } from "../schema/helpers";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

// A playable guide plus a planned backlog entry with no build (#7 Build 1).
function libraryWithBacklog() {
  const library = validLibrary();
  library.guides = [
    ...library.guides,
    {
      ...library.guides[0],
      id: "future-quest",
      title: "Future Quest — planned",
      game: "Future Quest",
      status: "planned",
    },
  ] as never;
  return library;
}

function stubContentFetch(library: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) return Response.json(library);
      if (url.endsWith("guides/fictional-quest/approvals.json")) {
        return Response.json({
          schemaVersion: SCHEMA_VERSION,
          guideId: "fictional-quest",
          layers: [{ ...validLayer("approved"), id: "layer-spine" }],
        });
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

function renderLibrary() {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: ["/"] }),
  );
  render(<RouterProvider router={router} />);
}

describe("library backlog (Build 1)", () => {
  it("shows a planned entry in player mode as a non-navigable card", async () => {
    stubContentFetch(libraryWithBacklog());
    renderLibrary();
    const title = await screen.findByText("Future Quest — planned");
    // Backlog cards never link anywhere — no play view, no review lens.
    expect(title.closest("a")).toBeNull();
    expect(screen.getByText("planned")).toBeDefined();
  });

  it("de-emphasizes the planned card and keeps playable cards navigable", async () => {
    stubContentFetch(libraryWithBacklog());
    renderLibrary();
    const planned = await screen.findByText("Future Quest — planned");
    expect(planned.closest('[class*="opacity-"]')).not.toBeNull();
    const playable = screen.getByText("Fictional Quest — 100% guide");
    expect(playable.closest("a")).not.toBeNull();
  });
});
