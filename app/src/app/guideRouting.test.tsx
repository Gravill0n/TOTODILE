// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  writeSlot,
} from "@/features/progress/progressStore";
import { renderAppAt, stubGuideContent } from "@/testing/renderRoute";

// The guide route is a layout: one guard, one loader, and the visit page
// underneath it. These tests drive the URL, not the components — what belongs
// here is the redirect, the deep link, bad params, and the promise that the
// shared data is fetched once per guide rather than once per child route.

const S1_TEXT = /Talk to gatekeeper ×2/;
// Chapter 1's first visit — where the pointer starts on a fresh slot.
const FIRST_VISIT = "/guide/fictional-quest/chapter/c1/visit/v-castle-gate-1";
// c2:s4 lives in the vault antechamber visit, and is its only step.
const ANTECHAMBER_STEP = "fictional-quest:c2:s4";
const ANTECHAMBER_TEXT = /Stock up at diver's cache/;
const ANTECHAMBER_VISIT =
  "/guide/fictional-quest/chapter/c2/visit/v-vault-antechamber-1";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("guide routing (design v2 — the place is the page)", () => {
  it("redirects the guide index to the pointer's visit and rewrites the URL", async () => {
    stubGuideContent();
    const router = renderAppAt("/guide/fictional-quest");
    await screen.findByText(S1_TEXT);
    expect(router.state.location.pathname).toBe(FIRST_VISIT);
  });

  it("lands on the stored pointer's visit, not the first one", async () => {
    await writeSlot({
      ...emptySlot("fictional-quest"),
      currentStepId: ANTECHAMBER_STEP,
    });
    stubGuideContent();
    const router = renderAppAt("/guide/fictional-quest");
    await screen.findByText(ANTECHAMBER_TEXT);
    expect(router.state.location.pathname).toBe(ANTECHAMBER_VISIT);
  });

  it("loads a deep link to a chapter/visit pair directly", async () => {
    stubGuideContent();
    const router = renderAppAt(ANTECHAMBER_VISIT);
    await screen.findByText(ANTECHAMBER_TEXT);
    // No redirect — a copied URL reloads exactly where it pointed.
    expect(router.state.location.pathname).toBe(ANTECHAMBER_VISIT);
  });

  it("shows not-found for a visit the guide does not contain", async () => {
    stubGuideContent();
    renderAppAt("/guide/fictional-quest/chapter/c1/visit/v-nowhere-9");
    expect(await screen.findByText("Nothing here")).toBeDefined();
  });

  it("shows not-found when the visit exists but under another chapter", async () => {
    stubGuideContent();
    renderAppAt("/guide/fictional-quest/chapter/c1/visit/v-vault-heart-1");
    expect(await screen.findByText("Nothing here")).toBeDefined();
  });

  it("fetches the guide, its RA mapping and its playability once per guide", async () => {
    const fetches = stubGuideContent();
    const router = renderAppAt(FIRST_VISIT);
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
    stubGuideContent({ playableSlugs: [] });
    renderAppAt("/guide/fictional-quest/place/castle-gate");
    // Not playable → /review → editor mode off → library.
    expect(
      await screen.findByRole("heading", { name: "Library" }),
    ).toBeDefined();
  });
});

// Every jump used to be a scroll into the one long spine. Now the step being
// jumped to lives on its own page, so a jump navigates first and scrolls after.
describe("jumps land on the visit that holds the step", () => {
  it("the chapter sheet opens a visit from another chapter", async () => {
    stubGuideContent();
    const router = renderAppAt(FIRST_VISIT);
    await screen.findByText(S1_TEXT);

    fireEvent.click(screen.getByTitle("Chapters"));
    // The sheet holds the same rail as the desktop column: expand a chapter,
    // then pick the place inside it.
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Chapter 2 — The Sunken Vault",
      }),
    );
    fireEvent.click(screen.getByRole("link", { name: /Sunken Vault/ }));

    await screen.findByText(/Dive at buoy/);
    expect(router.state.location.pathname).toBe(
      "/guide/fictional-quest/chapter/c2/visit/v-sunken-vault-1",
    );
  });

  it("Where am I comes back to the pointer's visit from anywhere", async () => {
    stubGuideContent();
    const router = renderAppAt(
      "/guide/fictional-quest/chapter/c2/visit/v-sunken-vault-1",
    );
    await screen.findByText(/Dive at buoy/);
    // The pointer is still on the fresh slot's first step, two chapters back.
    fireEvent.click(screen.getByTitle("Where am I"));

    await screen.findByText(S1_TEXT);
    expect(router.state.location.pathname).toBe(FIRST_VISIT);
  });

  it("a missable's Go opens the visit that missable is in", async () => {
    stubGuideContent();
    const router = renderAppAt(FIRST_VISIT);
    await screen.findByText(S1_TEXT);

    fireEvent.click(
      screen.getByRole("button", {
        name: /^Go to missable: Before draining the vault/,
      }),
    );

    await screen.findByText(/Feed moray eel a mushroom/);
    expect(router.state.location.pathname).toBe(
      "/guide/fictional-quest/chapter/c2/visit/v-sunken-vault-1",
    );
  });

  it("a deep link stays put — landing never yanks you to the pointer", async () => {
    stubGuideContent();
    const router = renderAppAt(ANTECHAMBER_VISIT);
    await screen.findByText(ANTECHAMBER_TEXT);
    expect(router.state.location.pathname).toBe(ANTECHAMBER_VISIT);
  });
});
