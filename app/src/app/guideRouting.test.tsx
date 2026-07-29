// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppRouter } from "@/app/router";
import {
  closeProgressDb,
  emptySlot,
  writeSlot,
} from "@/features/progress/progressStore";
import { SCHEMA_VERSION } from "@/schema";
import { readFixtureJson } from "@/testing/fixtureRepo";
import { validLayer, validLibrary } from "@/testing/helpers";

// The guide route is a layout: one guard, one loader, and the visit page
// underneath it. These tests drive the URL, not the components — what belongs
// here is the redirect, the deep link, bad params, and the promise that the
// shared data is fetched once per guide rather than once per child route.

const fixtureGuide = readFixtureJson("guides/fictional-quest/guide.json");

const S1_TEXT = /Talk to gatekeeper ×2/;
// Chapter 1's first visit — where the pointer starts on a fresh slot.
const FIRST_VISIT = "/guide/fictional-quest/chapter/c1/visit/v-castle-gate-1";
// c2:s4 lives in the vault antechamber visit.
const ANTECHAMBER_STEP = "fictional-quest:c2:s4";
const ANTECHAMBER_VISIT =
  "/guide/fictional-quest/chapter/c2/visit/v-vault-antechamber-1";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

function approvedApprovals() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    layers: [{ ...validLayer("approved"), id: "spine" }],
  };
}

const mapping = {
  schemaVersion: SCHEMA_VERSION,
  guideId: "fictional-quest",
  raGameId: 9000,
  entries: [
    {
      raAchievementId: 101,
      targetItemId: "fictional-quest:c1:s1",
      sourceRefs: ["src-wiki"],
      confidence: "normal",
    },
  ],
};

// Counts every content request so the "once per guide" promise is measurable.
function stubFetch() {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("library.json")) return Response.json(validLibrary());
      if (url.endsWith("guides/fictional-quest/approvals.json")) {
        return Response.json(approvedApprovals());
      }
      if (url.endsWith("guides/fictional-quest/layers/qa.report.json")) {
        return new Response("{}", { status: 200 });
      }
      if (url.endsWith("guides/fictional-quest/guide.json")) {
        return Response.json(fixtureGuide);
      }
      if (url.endsWith("guides/fictional-quest/ra-mapping.json")) {
        return Response.json(mapping);
      }
      return new Response("not found", { status: 404 });
    }),
  );
  return {
    count: (suffix: string) =>
      calls.filter((url) => url.endsWith(suffix)).length,
  };
}

function renderAt(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("guide routing (design v2 — the place is the page)", () => {
  it("redirects the guide index to the pointer's visit and rewrites the URL", async () => {
    stubFetch();
    const router = renderAt("/guide/fictional-quest");
    await screen.findByText(S1_TEXT);
    expect(router.state.location.pathname).toBe(FIRST_VISIT);
  });

  it("lands on the stored pointer's visit, not the first one", async () => {
    await writeSlot({
      ...emptySlot("fictional-quest"),
      currentStepId: ANTECHAMBER_STEP,
    });
    stubFetch();
    const router = renderAt("/guide/fictional-quest");
    await screen.findByText(S1_TEXT);
    expect(router.state.location.pathname).toBe(ANTECHAMBER_VISIT);
  });

  it("loads a deep link to a chapter/visit pair directly", async () => {
    stubFetch();
    const router = renderAt(ANTECHAMBER_VISIT);
    await screen.findByText(S1_TEXT);
    // No redirect — a copied URL reloads exactly where it pointed.
    expect(router.state.location.pathname).toBe(ANTECHAMBER_VISIT);
  });

  it("shows not-found for a visit the guide does not contain", async () => {
    stubFetch();
    renderAt("/guide/fictional-quest/chapter/c1/visit/v-nowhere-9");
    expect(await screen.findByText("Nothing here")).toBeDefined();
  });

  it("shows not-found when the visit exists but under another chapter", async () => {
    stubFetch();
    renderAt("/guide/fictional-quest/chapter/c1/visit/v-vault-heart-1");
    expect(await screen.findByText("Nothing here")).toBeDefined();
  });

  it("fetches the guide, its RA mapping and its playability once per guide", async () => {
    const fetches = stubFetch();
    const router = renderAt(FIRST_VISIT);
    await screen.findByText(S1_TEXT);

    await router.navigate({
      to: "/guide/$slug/cleanup",
      params: { slug: "fictional-quest" },
    });
    await screen.findByText("Mastery");

    expect(fetches.count("guides/fictional-quest/guide.json")).toBe(1);
    expect(fetches.count("guides/fictional-quest/ra-mapping.json")).toBe(1);
    expect(fetches.count("guides/fictional-quest/approvals.json")).toBe(1);
  });

  it("still bounces a non-playable guide away from every play-view child", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("library.json")) return Response.json(validLibrary());
        return new Response("not found", { status: 404 });
      }),
    );
    renderAt("/guide/fictional-quest/place/castle-gate");
    // Not playable → /review → editor mode off → library.
    expect(
      await screen.findByRole("heading", { name: "Library" }),
    ).toBeDefined();
  });
});
