// @vitest-environment jsdom
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "../../src/shell/router";
import { validLibrary } from "../schema/helpers";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

function stubLibraryFetch(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(payload)),
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
    stubLibraryFetch(libraryWithTwoGuides());
    renderAt("/");
    expect(
      await screen.findByText("Fictional Quest — 100% guide"),
    ).toBeDefined();
    expect(screen.getByText("Ghost Quest — draft guide")).toBeDefined();
    expect(screen.getByText("in compilation")).toBeDefined();
    expect(screen.getAllByText("en")).toHaveLength(2);
  });

  it("reaches the guide placeholder in one tap from a card (§7)", async () => {
    stubLibraryFetch(libraryWithTwoGuides());
    renderAt("/");
    const card = await screen.findByText("Fictional Quest — 100% guide");
    fireEvent.click(card.closest("a") ?? card);
    expect(
      await screen.findByText(/Play view arrives with spine rendering/),
    ).toBeDefined();
  });

  it("renders the posture skeleton's bottom action bar on the guide screen", async () => {
    stubLibraryFetch(libraryWithTwoGuides());
    renderAt("/guide/fictional-quest");
    await screen.findByText("Fictional Quest — 100% guide");
    expect(screen.getByTitle("Where am I")).toBeDefined();
    expect(screen.getByTitle("Sync")).toBeDefined();
  });

  it("shows a visible broken state on a malformed manifest (§11.1)", async () => {
    stubLibraryFetch({ schemaVersion: 0, guides: [{ id: 42 }] });
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

  it("shows not-found for a slug the library does not contain", async () => {
    stubLibraryFetch(libraryWithTwoGuides());
    renderAt("/guide/does-not-exist");
    expect(await screen.findByText("Nothing here")).toBeDefined();
  });
});
