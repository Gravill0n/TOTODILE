// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "../../src/progress/progressStore";
import { setEditorMode } from "../../src/review/editorMode";
import { closeReviewDb } from "../../src/review/reviewStore";
import { SCHEMA_VERSION } from "../../src/schema";
import { createAppRouter } from "../../src/shell/router";
import { validGuide, validLibrary, validSources } from "../schema/helpers";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  setEditorMode(false);
  localStorage.clear();
  await closeProgressDb();
  await closeReviewDb();
  await deleteDB("totodile");
  await deleteDB("totodile-review");
});

const HEX64 = "a".repeat(64);

function reportFile(layer: string, pass: string, flagged: string[]) {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    pass,
    layer,
    generatedAt: "2026-06-13T00:00:00Z",
    inputs:
      layer === "qa" ? [{ file: "layers/spine.json", sha256: HEX64 }] : [],
    report: { rowCount: 2, anomalies: [], flaggedItemIds: flagged },
    notes: [],
  };
}

// Flag step s1 so exactly one step (s2) is left to spot-check — a deterministic
// sample of one, regardless of the shuffle.
function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) return Response.json(validLibrary());
      if (url.endsWith("guides/fictional-quest/layers/manifest.json")) {
        return Response.json({
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
        });
      }
      if (url.endsWith("guides/fictional-quest/layers/spine.report.json")) {
        return Response.json(
          reportFile("spine", "spine", ["fictional-quest:c1:s1"]),
        );
      }
      if (url.endsWith("guides/fictional-quest/guide.json")) {
        return Response.json(validGuide());
      }
      if (url.endsWith("guides/fictional-quest/sources.json")) {
        return Response.json(validSources());
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

function renderReview() {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: ["/review/fictional-quest"] }),
  );
  render(<RouterProvider router={router} />);
}

describe("spot-check flow (FR-E3/E4)", () => {
  it("samples a confident row, records a verdict, and persists it across a remount", async () => {
    setEditorMode(true);
    stubFetch();
    renderReview();

    fireEvent.click(await screen.findByRole("button", { name: /spine/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Spot-check 1/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Pass/ }));
    expect(await screen.findByText(/1 pass, 0 fail/)).toBeDefined();

    // Remount from scratch: the verdict comes back from the review store.
    cleanup();
    renderReview();
    fireEvent.click(await screen.findByRole("button", { name: /spine/ }));
    expect(await screen.findByText(/1 pass, 0 fail/)).toBeDefined();
  });
});
