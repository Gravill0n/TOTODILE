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
const fixtureRaMapping = JSON.parse(
  readFileSync(join(fixtureDir, "ra-mapping.json"), "utf8"),
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

function manifest({ sameSlotWidgets = false, raMappingStage = false } = {}) {
  const widgetEntry = (seg: string, locationId: string) => ({
    id: `widget-${seg}`,
    kind: "widget",
    artifact: `layers/widget-${seg}.json`,
    report: `layers/widget-${seg}.report.json`,
    sha256: HEX64,
    widget: {
      deckPosition: 2,
      scope: { kind: "location", locationId },
      title: "Wild Encounters",
    },
  });
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
      ...(sameSlotWidgets
        ? [
            widgetEntry("enc-gate", "fictional-quest:castle-gate"),
            widgetEntry("enc-yard", "fictional-quest:courtyard"),
          ]
        : []),
      ...(raMappingStage
        ? [
            {
              id: "ra-mapping",
              kind: "ra-mapping",
              artifact: "layers/ra-mapping.json",
              report: "layers/ra-mapping.report.json",
              sha256: HEX64,
            },
          ]
        : []),
    ],
  };
}

// Two dataTable widgets filling the same deck slot at different locations —
// the Crystal encounter-table shape, minimally.
function encWidgetLayer(seg: string, locationId: string, flagged: boolean) {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    pass: "widget",
    widget: {
      id: `fictional-quest:${seg}`,
      title: "Wild Encounters",
      scope: { kind: "location", locationId },
      deckPosition: 2,
      type: "checklist",
      rows: [
        {
          itemId: `fictional-quest:${seg}:r1`,
          label: `Rat swarm at ${seg}`,
          sourceRefs: ["src-wiki"],
          confidence: flagged ? "flagged" : "normal",
        },
      ],
    },
  };
}

function widgetReport(seg: string, flagged: string[]) {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    pass: "widget",
    layer: `widget-${seg}`,
    generatedAt: "2026-06-13T00:00:00Z",
    inputs: [],
    report: { rowCount: 1, anomalies: [], flaggedItemIds: flagged },
    notes: [],
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

function stubFetch({
  approvals,
  assembled = true,
  sameSlotWidgets = false,
  raMappingStage = false,
}: {
  approvals?: unknown;
  assembled?: boolean;
  sameSlotWidgets?: boolean;
  raMappingStage?: boolean;
} = {}) {
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
        return Response.json(manifest({ sameSlotWidgets, raMappingStage }));
      }
      if (url.endsWith("guides/fictional-quest/ra-mapping.json")) {
        return raMappingStage
          ? Response.json(fixtureRaMapping)
          : new Response("not found", { status: 404 });
      }
      if (url.endsWith("layers/ra-mapping.report.json")) {
        return Response.json({
          schemaVersion: SCHEMA_VERSION,
          guideId: "fictional-quest",
          pass: "ra-mapping",
          layer: "ra-mapping",
          generatedAt: "2026-06-13T00:00:00Z",
          inputs: [],
          report: {
            rowCount: 6,
            anomalies: [],
            // RA #101's target is a spine step — the target-approved case.
            flaggedItemIds: ["fictional-quest:c1:s3"],
          },
          notes: [],
        });
      }
      if (url.endsWith("layers/widget-enc-gate.json")) {
        return Response.json(
          encWidgetLayer("enc-gate", "fictional-quest:castle-gate", true),
        );
      }
      if (url.endsWith("layers/widget-enc-yard.json")) {
        return Response.json(
          encWidgetLayer("enc-yard", "fictional-quest:courtyard", false),
        );
      }
      if (url.endsWith("layers/widget-enc-gate.report.json")) {
        return Response.json(
          widgetReport("enc-gate", ["fictional-quest:enc-gate:r1"]),
        );
      }
      if (url.endsWith("layers/widget-enc-yard.report.json")) {
        return Response.json(widgetReport("enc-yard", []));
      }
      // Pipeline completion signal — only exists once QA has run.
      if (url.endsWith("guides/fictional-quest/layers/qa.report.json")) {
        return assembled
          ? new Response("{}", { status: 200 })
          : new Response("not found", { status: 404 });
      }
      if (url.endsWith("guides/fictional-quest/layers/spine.report.json")) {
        return Response.json(spineReport());
      }
      // Mid-pipeline (pre-QA) there is no guide.json — the lens assembles
      // in-memory from the spine layer instead.
      if (url.endsWith("guides/fictional-quest/guide.json")) {
        return assembled
          ? Response.json(fixtureGuide)
          : new Response("not found", { status: 404 });
      }
      if (url.endsWith("guides/fictional-quest/layers/spine.json")) {
        return Response.json({
          schemaVersion: fixtureGuide.schemaVersion,
          guideId: "fictional-quest",
          pass: "spine",
          locations: fixtureGuide.locations,
          chapters: fixtureGuide.chapters,
        });
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

  it("renders flagged rows mid-pipeline, before guide.json exists (spine stage)", async () => {
    setEditorMode(true);
    stubFetch({ assembled: false });
    renderAt("/review/fictional-quest");

    const layerToggle = await screen.findByRole("button", { name: /spine/ });
    fireEvent.click(layerToggle);
    // Row content resolved through the in-memory spine assembly.
    expect(await screen.findByText(/Pry the Old Coin/)).toBeDefined();
  });

  it("merges same-slot widgets into one card with per-member flagged rows", async () => {
    setEditorMode(true);
    // Mid-pipeline: two encounter widgets share deck slot 2 at different
    // locations. The lens shows ONE slot card, not one card per widget.
    stubFetch({ assembled: false, sameSlotWidgets: true });
    renderAt("/review/fictional-quest");

    const slotToggle = await screen.findByRole("button", {
      name: /Wild Encounters/,
    });
    expect(
      screen.getAllByRole("button", { name: /Wild Encounters/ }),
    ).toHaveLength(1);
    expect(slotToggle.textContent).toMatch(/2 members/);
    expect(slotToggle.textContent).toMatch(/1 flagged/);

    fireEvent.click(slotToggle);
    // The flagged member gets a subsection named by its location…
    expect(await screen.findByText(/Rat swarm at enc-gate/)).toBeDefined();
    expect(screen.getByText(/Castle Gate/)).toBeDefined();
    // …the clean member collapses to a count line.
    expect(screen.getByText(/1 member layer\(s\) with no flags/)).toBeDefined();
  });

  it("shows waiting placeholders naming the unlock passes at spine stage (T6)", async () => {
    setEditorMode(true);
    stubFetch({ assembled: false });
    renderAt("/review/fictional-quest");

    await screen.findByRole("button", { name: /spine/ });
    // The two later stages have not run — each placeholder names the skill
    // that unlocks it once the current stage is approved and committed.
    expect(screen.getByText(/guide-pass-widgets/)).toBeDefined();
    expect(screen.getByText(/guide-pass-ra-mapping/)).toBeDefined();
    // The export helper names the earliest incomplete stage.
    expect(screen.getByText(/Spine stage is not fully approved/)).toBeDefined();
  });

  it("renders the three stage sections with folded status badges (T6)", async () => {
    setEditorMode(true);
    stubFetch({
      approvals: approvedApprovals(),
      assembled: false,
      sameSlotWidgets: true,
      raMappingStage: true,
    });
    renderAt("/review/fictional-quest");

    expect(
      await screen.findByRole("heading", { name: /Spine.*Approved/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: /Widgets.*In review/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: /RA mapping.*In review/ }),
    ).toBeDefined();
  });

  it("badges a flagged ra-mapping row whose target is already approved (T6)", async () => {
    setEditorMode(true);
    // Spine approved and committed; the ra-mapping pass re-flags one of its
    // steps as a mapping target. Pierre judges the mapping only — the row
    // content already passed review.
    stubFetch({
      approvals: approvedApprovals(),
      assembled: false,
      raMappingStage: true,
    });
    renderAt("/review/fictional-quest");

    fireEvent.click(await screen.findByRole("button", { name: /ra-mapping/ }));
    expect(await screen.findByText(/RA #101/)).toBeDefined();
    expect(screen.getByText(/target already approved/)).toBeDefined();
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
