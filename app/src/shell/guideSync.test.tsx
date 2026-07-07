// @vitest-environment jsdom
import "fake-indexeddb/auto";

vi.mock("@retroachievements/api", () => ({
  buildAuthorization: vi.fn((options) => options),
  getGameInfoAndUserProgress: vi.fn(async () => ({
    achievements: {
      101: {
        id: 101,
        dateEarned: "2022-01-01 00:00:00",
        dateEarnedHardcore: "",
      },
    },
  })),
}));

import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb, readSlot } from "@/progress/progressStore";
import { SCHEMA_VERSION } from "@/schema";
import { createAppRouter } from "@/shell/router";
import { clearCredentials, setCredentials } from "@/sync/raCredentials";
import { readFixtureJson } from "@/testing/fixtureRepo";
import { validLayer, validLibrary } from "@/testing/helpers";

const fixtureGuide = readFixtureJson("guides/fictional-quest/guide.json");

const TARGET = "fictional-quest:c1:s1";

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
      targetItemId: TARGET,
      sourceRefs: ["src-wiki"],
      confidence: "normal",
    },
  ],
};

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) return Response.json(validLibrary());
      if (url.endsWith("guides/fictional-quest/approvals.json")) {
        return Response.json(approvedApprovals());
      }
      // Pipeline completion signal — playability checks only that it exists.
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
}

async function renderGuide() {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: ["/guide/fictional-quest"] }),
  );
  render(<RouterProvider router={router} />);
  // The play view renders only once progress is ready.
  await screen.findByText(/Talk to gatekeeper ×2/);
}

describe("guide Sync (FR-C2/C3/C4)", () => {
  it("marks mapped unlocks done and shows the three-bucket receipt", async () => {
    setCredentials({ username: "Pierre", webApiKey: "KEY" });
    stubFetch();
    await renderGuide();

    fireEvent.click(screen.getByTitle("Sync"));

    expect(await screen.findByText(/1 newly marked/)).toBeDefined();
    await vi.waitFor(async () => {
      const slot = await readSlot("fictional-quest");
      expect(slot.itemStates[TARGET]?.state).toBe("done");
    });
  });

  it("shows the Settings-pointing error and marks nothing without a key", async () => {
    clearCredentials();
    stubFetch();
    await renderGuide();

    fireEvent.click(screen.getByTitle("Sync"));

    expect(await screen.findByText(/Add your RetroAchievements/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Settings" })).toBeDefined();
    const slot = await readSlot("fictional-quest");
    expect(slot.itemStates[TARGET]).toBeUndefined();
  });
});
