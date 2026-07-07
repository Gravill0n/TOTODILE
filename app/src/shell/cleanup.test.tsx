// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "@/features/progress/progressStore";
import { setEditorMode } from "@/review/editorMode";
import { SCHEMA_VERSION } from "@/schema";
import { createAppRouter } from "@/shell/router";
import { readFixtureJson } from "@/testing/fixtureRepo";
import { validLayer, validLibrary } from "@/testing/helpers";

const fixtureGuide = readFixtureJson("guides/fictional-quest/guide.json");

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  setEditorMode(false);
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

function stubFetch({ playable = true } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("library.json")) return Response.json(validLibrary());
      if (url.endsWith("guides/fictional-quest/approvals.json")) {
        return playable
          ? Response.json(approvedApprovals())
          : new Response("not found", { status: 404 });
      }
      // Pipeline completion signal — playability checks only that it exists.
      if (url.endsWith("guides/fictional-quest/layers/qa.report.json")) {
        return playable
          ? new Response("{}", { status: 200 })
          : new Response("not found", { status: 404 });
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

function renderAt(path: string) {
  render(
    <RouterProvider
      router={createAppRouter(createMemoryHistory({ initialEntries: [path] }))}
    />,
  );
}

describe("cleanup view (S4, FR-B4/P7)", () => {
  it("lists remaining tasks with a mastery bar and ticks them off", async () => {
    stubFetch();
    renderAt("/guide/fictional-quest/cleanup");

    expect(await screen.findByText("Mastery")).toBeDefined();
    const task = await screen.findByRole("checkbox", {
      name: /Talk to gatekeeper/,
    });
    fireEvent.click(task);

    await vi.waitFor(() => {
      expect(
        screen.queryByRole("checkbox", { name: /Talk to gatekeeper/ }),
      ).toBeNull();
    });
  });

  it("redirects to review when the guide is not yet playable", async () => {
    stubFetch({ playable: false });
    renderAt("/guide/fictional-quest/cleanup");
    // Not playable → /review → editor mode off → library.
    expect(
      await screen.findByRole("heading", { name: "Library" }),
    ).toBeDefined();
  });
});
