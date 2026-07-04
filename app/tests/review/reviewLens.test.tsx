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
import { setEditorMode } from "../../src/review/editorMode";
import { SCHEMA_VERSION } from "../../src/schema";
import { createAppRouter } from "../../src/shell/router";
import { validLayer, validLibrary } from "../schema/helpers";

const fixtureDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "repo",
  "guides",
  "fictional-quest",
);
const fixtureGuide = JSON.parse(
  readFileSync(join(fixtureDir, "guide.json"), "utf8"),
);
const fixtureSources = JSON.parse(
  readFileSync(join(fixtureDir, "sources.json"), "utf8"),
);

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  setEditorMode(false);
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

const HEX64 = "a".repeat(64);

function manifest() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    entries: [
      {
        id: "spine",
        kind: "spine",
        artifact: "layers/spine.json",
        report: "layers/spine.report.json",
        sha256: HEX64,
      },
    ],
  };
}

function spineReport() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    pass: "spine",
    layer: "spine",
    generatedAt: "2026-06-13T00:00:00Z",
    inputs: [],
    report: {
      rowCount: 10,
      anomalies: [],
      // Step s2 carries src-wiki (linked) + src-manual (paper, no link).
      flaggedItemIds: ["fictional-quest:c1:s2"],
    },
    notes: [],
  };
}

function approvedApprovals() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    layers: [{ ...validLayer("approved"), id: "spine" }],
  };
}

function stubFetch({ approvals }: { approvals?: unknown } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) return Response.json(validLibrary());
      if (url.endsWith("guides/fictional-quest/approvals.json")) {
        return approvals
          ? Response.json(approvals)
          : new Response("not found", { status: 404 });
      }
      if (url.endsWith("guides/fictional-quest/layers/manifest.json")) {
        return Response.json(manifest());
      }
      if (url.endsWith("guides/fictional-quest/layers/spine.report.json")) {
        return Response.json(spineReport());
      }
      if (url.endsWith("guides/fictional-quest/guide.json")) {
        return Response.json(fixtureGuide);
      }
      if (url.endsWith("guides/fictional-quest/sources.json")) {
        return Response.json(fixtureSources);
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

describe("review lens — flagged rows (FR-E2/E3)", () => {
  it("shows a flagged row beside its source, with an open-source link", async () => {
    setEditorMode(true);
    stubFetch();
    renderAt("/review/fictional-quest");

    const layerToggle = await screen.findByRole("button", { name: /spine/ });
    expect(layerToggle.textContent).toMatch(/1 flagged/);
    fireEvent.click(layerToggle);

    expect(await screen.findByText(/Pry the Old Coin/)).toBeDefined();
    expect(screen.getByText(/Fictional Quest community wiki/)).toBeDefined();
    const link = screen.getByRole("link", { name: /Open source/ });
    expect(link.getAttribute("href")).toBe(
      "https://example.org/fictional-quest/walkthrough",
    );
  });

  it("redirects an already-playable guide away from review to play", async () => {
    setEditorMode(true);
    stubFetch({ approvals: approvedApprovals() });
    renderAt("/review/fictional-quest");
    expect(await screen.findByText(/Talk to gatekeeper ×2/)).toBeDefined();
  });

  it("redirects to the library when editor mode is off (§9.3)", async () => {
    stubFetch();
    renderAt("/review/fictional-quest");
    expect(
      await screen.findByRole("heading", { name: "Library" }),
    ).toBeDefined();
  });
});
