// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "@/features/progress/progressStore";
import { setEditorMode } from "@/features/review/editorMode";
import { closeReviewDb } from "@/features/review/reviewStore";
import { approvalsFile, SCHEMA_VERSION } from "@/schema";
import { createAppRouter } from "@/shell/router";
import { validGuide, validLibrary, validSources } from "@/testing/helpers";

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

// Mid-pipeline group state: spine + two widgets sharing deck slot 2, one
// confident row each, no guide.json yet — the merged slot-card shape (T5).
function stubFetchGroup() {
  const guide = validGuide();
  const widgetEntry = (seg: string) => ({
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
  });
  const encWidget = (seg: string) => ({
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    pass: "widget",
    widget: {
      id: `fictional-quest:${seg}`,
      title: "Wild Encounters",
      scope: { kind: "location", locationId: `fictional-quest:${seg}` },
      deckPosition: 2,
      type: "checklist",
      rows: [
        {
          itemId: `fictional-quest:${seg}:r1`,
          label: `Rat swarm at ${seg}`,
          sourceRefs: ["src-wiki"],
          confidence: "normal",
        },
      ],
    },
  });
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
            widgetEntry("enc-gate"),
            widgetEntry("enc-yard"),
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
      if (url.endsWith("guides/fictional-quest/layers/spine.json")) {
        return Response.json({
          schemaVersion: SCHEMA_VERSION,
          guideId: "fictional-quest",
          pass: "spine",
          locations: guide.locations,
          chapters: guide.chapters,
        });
      }
      if (url.endsWith("layers/widget-enc-gate.json")) {
        return Response.json(encWidget("enc-gate"));
      }
      if (url.endsWith("layers/widget-enc-yard.json")) {
        return Response.json(encWidget("enc-yard"));
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

  it("samples across a slot group and routes verdicts to the owning member (T5b)", async () => {
    setEditorMode(true);
    stubFetchGroup();
    renderReview();

    fireEvent.click(
      await screen.findByRole("button", { name: /Wild Encounters/ }),
    );
    // The pool is the union of both members' confident rows.
    expect(
      await screen.findByText(/sampled across 2 member layers/),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Spot-check 2/ }));
    for (const pass of await screen.findAllByRole("button", {
      name: /Pass/,
    })) {
      fireEvent.click(pass);
    }
    expect(await screen.findByText(/2 pass, 0 fail/)).toBeDefined();

    // Each verdict lands on its own member's record — never on the group.
    const file = await exportApprovals();
    const gate = file.layers.find((l) => l.id === "widget-enc-gate");
    const yard = file.layers.find((l) => l.id === "widget-enc-yard");
    expect(gate?.spotChecks.map((s) => s.itemId)).toEqual([
      "fictional-quest:enc-gate:r1",
    ]);
    expect(yard?.spotChecks.map((s) => s.itemId)).toEqual([
      "fictional-quest:enc-yard:r1",
    ]);
  });
});
