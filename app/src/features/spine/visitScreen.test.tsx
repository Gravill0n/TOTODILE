// @vitest-environment jsdom
import "fake-indexeddb/auto";
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb, readSlot } from "@/features/progress/progressStore";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";

// The play view is scoped to one visit — the place *is* the page. The pointer
// keeps its old semantics (stored, auto-advancing, never moved by browsing);
// what changed is that only the displayed visit's steps are in the DOM, so
// pointer moves that leave the visit are asserted on the stored slot.

const GATE = "/chapter/c1/visit/v-castle-gate-1";
const WALL = "/chapter/c1/visit/v-castle-wall-1";
const VAULT = "/chapter/c2/visit/v-sunken-vault-1";

const S1_TEXT = /Talk to gatekeeper ×2/;
const S2_TEXT = /Pry Old Coin from loose brick/;
const S3_TEXT = /Beat Sentry Captain/;
const DIVE_TEXT = /Dive at buoy/;

const S1 = "fictional-quest:c1:s1";
const S2 = "fictional-quest:c1:s2";
const S3 = "fictional-quest:c1:s3";

// Prev/next appear twice — compact beside the breadcrumb, named at the foot of
// the page — so queries say which pair they mean.
const footer = () => within(screen.getByLabelText("Visit navigation"));

// The keyword headlines, matching what StepRow renders and labels with.
const s1Full = "Talk to gatekeeper ×2 · Take rusty lantern";
const s2Full = "Pry Old Coin from loose brick";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeProgressDb();
  await deleteDB("totodile");
});

function currentText(): string {
  return document.querySelector("[data-current]")?.textContent ?? "";
}

function checkboxFor(stepText: string) {
  return screen.getByLabelText(`Done: ${stepText.slice(0, 40)}`);
}

const pointer = async () =>
  (await readSlot("fictional-quest")).currentStepId ?? null;

describe("visit page (S2 — one visit at a time)", () => {
  it("renders only the displayed visit's steps", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    // s1 and s2 live in this visit; s3 is the next visit's only step.
    expect(screen.getByText(S2_TEXT)).toBeDefined();
    expect(screen.queryByText(S3_TEXT)).toBeNull();
    expect(screen.queryByText(DIVE_TEXT)).toBeNull();
  });

  it("lands with the first step current on first open (FR-A4)", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest");
    await screen.findByText(S1_TEXT);
    expect(currentText()).toMatch(S1_TEXT);
    expect(screen.getByText("Now")).toBeDefined();
  });

  it("checking the current step auto-advances the pointer", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    fireEvent.click(checkboxFor(s1Full));
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
  });

  it("checking a non-current step leaves the pointer, and advance skips it later", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    fireEvent.click(checkboxFor(s2Full));
    expect(currentText()).toMatch(S1_TEXT);
    fireEvent.click(checkboxFor(s1Full));
    // s2 is already done, so the pointer walks past it into the next visit.
    await waitFor(async () => expect(await pointer()).toBe(S3));
  });

  it("unchecking a done step never moves the pointer", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    fireEvent.click(checkboxFor(s1Full));
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
    fireEvent.click(checkboxFor(s1Full));
    expect(currentText()).toMatch(S2_TEXT);
  });

  it("tapping a step's text moves the pointer there (§6.7 manual move)", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    fireEvent.click(
      screen.getByRole("button", { name: /^Pry Old Coin from loose brick/ }),
    );
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
    expect(await pointer()).toBe(S2);
  });

  it("the pointer survives a remount (stored, not derived)", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    fireEvent.click(checkboxFor(s1Full));
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
    cleanup();

    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
  });

  it("renders the chapter intro, the location heading and missable treatment", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    expect(screen.getByText(/The road ends at the portcullis/)).toBeDefined();
    // The visit is headed by its place. It is a heading, not a link: the place
    // screen was retired (2026-07-29) — the visit page is the place now.
    expect(
      screen.getByRole("heading", { level: 2, name: "Castle Gate" }),
    ).toBeDefined();
    expect(screen.getAllByText(/missable/i).length).toBeGreaterThan(0);
  });
});

describe("visit page furniture", () => {
  it("heads the page with a breadcrumb that says where and how far", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);

    const crumbs = screen.getByLabelText("breadcrumb");
    expect(crumbs.textContent).toContain("Chapter 1 — The Castle Gate");
    expect(crumbs.textContent).toContain("Castle Gate");
    expect(crumbs.textContent).toContain("visit 1");
    // The pointer is on the first of this visit's two steps.
    expect(crumbs.textContent).toContain("step 1 of 2");
  });

  it("counts steps rather than the pointer when the pointer is elsewhere", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", VAULT);
    await screen.findByText(DIVE_TEXT);
    // The pointer is still back in chapter 1, so there is no "step N" here.
    const crumbs = screen.getByLabelText("breadcrumb");
    expect(crumbs.textContent).toContain("3 steps");
    expect(crumbs.textContent).not.toContain("step 1 of");
  });

  it("names the place and what is in it", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", VAULT);
    await screen.findByText(DIVE_TEXT);

    expect(
      screen.getByRole("heading", { level: 2, name: "Sunken Vault" }),
    ).toBeDefined();
    // One visit to this place, three steps, no achievements to earn here.
    expect(screen.getByText("Visit 1 of 1 · 3 steps")).toBeDefined();
  });

  it("counts the achievements earnable in this visit", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", "/chapter/c1/visit/v-castle-wall-1");
    await screen.findByText(S3_TEXT);
    expect(screen.getByText(/1 achievement\b/)).toBeDefined();
  });

  it("offers no way back to a NOW row that is already on screen", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    // jsdom has no IntersectionObserver, so useInView answers "in view" — a
    // Back-to-NOW button here would be pointing at a visible row.
    expect(screen.queryByText(/^Back to NOW/)).toBeNull();
  });

  it("repeats prev/next at the bottom, naming where they go", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", VAULT);
    await screen.findByText(DIVE_TEXT);

    // Top pair is compact; the bottom pair names its destination.
    expect(
      footer().getByRole("button", { name: "Next visit — Vault Antechamber" })
        .textContent,
    ).toContain("Vault Antechamber");
  });
});

describe("visit navigation (URL, never local state)", () => {
  it("walks to the next visit by changing the URL, without moving the pointer", async () => {
    stubGuideContent();
    const router = renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);

    fireEvent.click(footer().getByRole("button", { name: /^Next visit/ }));

    await screen.findByText(S3_TEXT);
    expect(router.state.location.pathname).toBe(
      `/guide/fictional-quest${WALL}`,
    );
    expect(screen.queryByText(S1_TEXT)).toBeNull();
    // Browsing is not progress: the pointer stayed on the first step.
    expect(await pointer()).toBe(S1);
  });

  it("walks back to the previous visit, crossing chapter boundaries", async () => {
    stubGuideContent();
    const router = renderGuideAt("fictional-quest", VAULT);
    await screen.findByText(DIVE_TEXT);

    fireEvent.click(footer().getByRole("button", { name: /^Previous visit/ }));

    await screen.findByText(/East stairs to docks/);
    expect(router.state.location.pathname).toBe(
      "/guide/fictional-quest/chapter/c1/visit/v-docks-1",
    );
  });

  it("offers no previous at the first visit and no next at the last", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", GATE);
    await screen.findByText(S1_TEXT);
    expect(
      footer().getByRole("button", { name: /^Previous visit/ }),
    ).toHaveProperty("disabled", true);

    cleanup();
    renderGuideAt("fictional-quest", "/chapter/c2/visit/v-vault-heart-1");
    await screen.findByText(/Defeat Vault Warden/);
    expect(
      footer().getByRole("button", { name: /^Next visit/ }),
    ).toHaveProperty("disabled", true);
  });
});
