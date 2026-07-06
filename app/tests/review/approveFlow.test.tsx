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

// Two widgets sharing deck slot 2 — the merged-card shape (T5).
function widgetEntry(seg: string) {
  return {
    id: `widget-${seg}`,
    kind: "widget",
    artifact: `layers/widget-${seg}.json`,
    report: `layers/widget-${seg}.report.json`,
    sha256: HEX64,
    widget: {
      deckPosition: 2,
      scope: { kind: "location", locationId: `fictional-quest:${seg}` },
      title: "Wild Encounters",
    },
  };
}

function stubFetch({ sameSlotWidgets = false } = {}) {
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
            ...(sameSlotWidgets
              ? [widgetEntry("enc-gate"), widgetEntry("enc-yard")]
              : []),
          ],
        });
      }
      if (url.endsWith("guides/fictional-quest/layers/spine.report.json")) {
        return Response.json(reportFile("spine", "spine", []));
      }
      if (url.endsWith("layers/widget-enc-gate.report.json")) {
        return Response.json(reportFile("widget-enc-gate", "widget", []));
      }
      if (url.endsWith("layers/widget-enc-yard.report.json")) {
        return Response.json(reportFile("widget-enc-yard", "widget", []));
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

// Stub the export path and hand back the assembled approvals file. URL is
// only stubbed here — replacing it earlier breaks new URL(...) in the loader.
async function exportApprovals() {
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
  return approvalsFile.parse(JSON.parse(await (captured as Blob).text()));
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

  it("fans a group approval out to every member with one shared date (T5b)", async () => {
    setEditorMode(true);
    stubFetch({ sameSlotWidgets: true });
    renderReview();

    fireEvent.click(
      await screen.findByRole("button", { name: /Wild Encounters/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Approve/ }));
    expect(await screen.findByText(/1\/1 slot/)).toBeDefined();

    const file = await exportApprovals();
    const gate = file.layers.find((l) => l.id === "widget-enc-gate");
    const yard = file.layers.find((l) => l.id === "widget-enc-yard");
    expect(gate?.status).toBe("approved");
    expect(yard?.status).toBe("approved");
    expect(yard?.approval?.date).toBe(gate?.approval?.date);
    // The group verdict never touches the other layers.
    expect(file.layers.find((l) => l.id === "spine")?.status).toBe("draft");
  });

  it("fans a group rejection note out to every member record (T5b)", async () => {
    setEditorMode(true);
    stubFetch({ sameSlotWidgets: true });
    renderReview();

    fireEvent.click(
      await screen.findByRole("button", { name: /Wild Encounters/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Reject/ }));
    fireEvent.change(
      screen.getByLabelText(/Rejection note for Wild Encounters slot/),
      { target: { value: "enc-gate lists the wrong levels" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
    expect((await screen.findAllByText("Rejected")).length).toBeGreaterThan(0);

    const file = await exportApprovals();
    for (const id of ["widget-enc-gate", "widget-enc-yard"]) {
      const record = file.layers.find((l) => l.id === id);
      expect(record?.status).toBe("rejected");
      expect(record?.approval?.note).toBe("enc-gate lists the wrong levels");
    }
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
