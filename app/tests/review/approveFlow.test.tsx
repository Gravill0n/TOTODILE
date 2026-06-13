// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "../../src/progress/progressStore";
import { setEditorMode } from "../../src/review/editorMode";
import { closeReviewDb } from "../../src/review/reviewStore";
import { approvalsFile, SCHEMA_VERSION } from "../../src/schema";
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

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) return Response.json(validLibrary());
      if (url.endsWith("guides/fictional-quest/layers/qa.report.json")) {
        return Response.json(reportFile("qa", "qa", []));
      }
      if (url.endsWith("guides/fictional-quest/layers/spine.report.json")) {
        return Response.json(reportFile("spine", "spine", []));
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

describe("approve/reject flow (FR-E4)", () => {
  it("approves a layer and exports a schema-valid approvals.json", async () => {
    setEditorMode(true);
    stubFetch();
    renderReview();

    fireEvent.click(await screen.findByRole("button", { name: /spine/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Approve/ }));
    expect(await screen.findByText(/1\/1 layer/)).toBeDefined();

    // The URL object is only stubbed for the export — replacing it earlier
    // breaks new URL(...) in the route loader.
    let captured: Blob | undefined;
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn((blob: Blob) => {
        captured = blob;
        return "blob:totodile";
      }),
      revokeObjectURL: vi.fn(),
    });

    fireEvent.click(screen.getByRole("button", { name: /Export approvals/ }));
    await vi.waitFor(() => expect(captured).toBeDefined());
    const file = approvalsFile.parse(
      JSON.parse(await (captured as Blob).text()),
    );
    expect(file.layers.find((l) => l.id === "spine")?.status).toBe("approved");
    expect(file.layers.find((l) => l.id === "spine")?.contentHash).toBe(
      `sha256:${HEX64}`,
    );
  });

  it("requires a note to reject (FR-E4)", async () => {
    setEditorMode(true);
    stubFetch();
    renderReview();

    fireEvent.click(await screen.findByRole("button", { name: /spine/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Reject/ }));

    const submit = screen.getByRole("button", { name: /Submit/ });
    expect(submit).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText(/Rejection note for spine/), {
      target: { value: "step contradicts the source" },
    });
    fireEvent.click(submit);
    // "Rejected" shows both in the layer badge and the decision panel.
    expect((await screen.findAllByText("Rejected")).length).toBeGreaterThan(0);
  });
});
