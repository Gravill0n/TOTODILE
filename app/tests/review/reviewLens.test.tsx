// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "../../src/progress/progressStore";
import { setEditorMode } from "../../src/review/editorMode";
import { approvalsFile, SCHEMA_VERSION } from "../../src/schema";
import { createAppRouter } from "../../src/shell/router";
import { validLayer, validLibrary } from "../schema/helpers";

const fixtureGuide = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "fixtures",
      "repo",
      "guides",
      "fictional-quest",
      "guide.json",
    ),
    "utf8",
  ),
);

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

function approvedApprovals(slug: string) {
  return approvalsFile.parse({
    schemaVersion: SCHEMA_VERSION,
    guideId: slug,
    layers: [{ ...validLayer("approved"), id: "layer-spine" }],
  });
}

// One approved layer + one still-draft layer: the guide is unfinished (FR-E5)
// but exercises the approved-vs-unapproved visual distinction (FR-E1).
function partlyReviewed(slug: string) {
  return approvalsFile.parse({
    schemaVersion: SCHEMA_VERSION,
    guideId: slug,
    layers: [
      { ...validLayer("approved"), id: "layer-spine" },
      { ...validLayer("draft"), id: "layer-widgets" },
    ],
  });
}

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) {
        return Response.json(libraryWithTwoGuides());
      }
      if (url.endsWith("guides/fictional-quest/approvals.json")) {
        return Response.json(approvedApprovals("fictional-quest"));
      }
      if (url.endsWith("guides/ghost-quest/approvals.json")) {
        return Response.json(partlyReviewed("ghost-quest"));
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

describe("review lens (S5)", () => {
  it("renders per-layer report cards, unapproved layers visually distinct (FR-E1)", async () => {
    setEditorMode(true);
    stubFetch();
    renderAt("/review/ghost-quest");
    expect(await screen.findByText("Review lens — unfinished")).toBeDefined();
    expect(screen.getByText("layer-widgets")).toBeDefined();
    expect(screen.getByText("Unreviewed")).toBeDefined();
    expect(screen.getByText("Approved")).toBeDefined();
    // The unapproved layer carries the missable treatment; the approved one
    // does not — that is the FR-E1 distinction.
    expect(document.querySelectorAll("li.border-missable")).toHaveLength(1);
  });

  it("redirects an already-playable guide away from review to play", async () => {
    setEditorMode(true);
    stubFetch();
    renderAt("/review/fictional-quest");
    expect(
      await screen.findByText(/Talk to the gatekeeper twice/),
    ).toBeDefined();
  });

  it("redirects to the library when editor mode is off (§9.3)", async () => {
    stubFetch();
    renderAt("/review/ghost-quest");
    expect(
      await screen.findByRole("heading", { name: "Library" }),
    ).toBeDefined();
  });
});
