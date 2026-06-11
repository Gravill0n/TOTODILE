// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "../../src/progress/progressStore";
import { createAppRouter } from "../../src/shell/router";
import { validLibrary } from "../schema/helpers";

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

function stubContentFetch(library: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) return Response.json(library);
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
  it("renders library cards from library.json, with the in-compilation treatment", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/");
    expect(
      await screen.findByText("Fictional Quest — 100% guide"),
    ).toBeDefined();
    expect(screen.getByText("Ghost Quest — draft guide")).toBeDefined();
    expect(screen.getByText("in compilation")).toBeDefined();
    expect(screen.getAllByText("en")).toHaveLength(2);
  });

  it("reaches the current step in one tap from a card (§7, FR-A4)", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/");
    const card = await screen.findByText("Fictional Quest — 100% guide");
    fireEvent.click(card.closest("a") ?? card);
    expect(
      await screen.findByText(/Talk to the gatekeeper twice/),
    ).toBeDefined();
    expect(document.querySelector("[data-current]")).not.toBeNull();
  });

  it("renders the posture skeleton's bottom action bar on the guide screen", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/fictional-quest");
    await screen.findByText(/Talk to the gatekeeper twice/);
    expect(screen.getByTitle("Where am I")).toBeDefined();
    expect(screen.getByTitle("Sync")).toBeDefined();
  });

  it("opens the chapter sheet from the ☰ action", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/fictional-quest");
    await screen.findByText(/Talk to the gatekeeper twice/);
    fireEvent.click(screen.getByTitle("Chapters"));
    expect(
      await screen.findByRole("button", {
        name: "Chapter 2 — The Sunken Vault",
      }),
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

  it("shows a visible broken state when a guide file is malformed or missing", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/ghost-quest");
    expect(await screen.findByText("Something is broken")).toBeDefined();
  });

  it("shows not-found for a slug the library does not contain", async () => {
    stubContentFetch(libraryWithTwoGuides());
    renderAt("/guide/does-not-exist");
    expect(await screen.findByText("Nothing here")).toBeDefined();
  });
});
