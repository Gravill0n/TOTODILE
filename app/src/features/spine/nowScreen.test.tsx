// @vitest-environment jsdom
import "fake-indexeddb/auto";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { GuideScreen } from "@/app/routes/GuideScreen";
import { closeProgressDb } from "@/features/progress/progressStore";
import { guideFile, libraryManifest } from "@/schema";
import { readFixtureJson } from "@/testing/fixtureRepo";

const guide = guideFile.parse(
  readFixtureJson("guides/fictional-quest/guide.json"),
);
const entry = libraryManifest.parse(readFixtureJson("library.json")).guides[0];
if (!entry) throw new Error("fixture library has no entry");

// The play view renders a step's keyword beats joined (stepHeadline); the
// full prose shows as `detail` only on the current step.
const S1_TEXT = /Talk to gatekeeper ×2/;
const S2_TEXT = /Pry Old Coin from loose brick/;
const S3_TEXT = /Beat Sentry Captain/;
const WARDEN_TEXT = /Defeat Vault Warden/;

afterEach(async () => {
  cleanup();
  await closeProgressDb();
  await deleteDB("totodile");
});

function currentText(): string {
  return document.querySelector("[data-current]")?.textContent ?? "";
}

function checkboxFor(stepText: string) {
  return screen.getByLabelText(`Done: ${stepText.slice(0, 40)}`);
}

// The keyword headlines, matching what StepRow renders and labels with.
const s1Full = "Talk to gatekeeper ×2 · Take rusty lantern";
const s2Full = "Pry Old Coin from loose brick";

describe("spine play view", () => {
  it("lands with the first step current on first open (FR-A4)", async () => {
    render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    expect(currentText()).toMatch(S1_TEXT);
    expect(screen.getByText("Now")).toBeDefined();
  });

  it("checking the current step auto-advances the pointer", async () => {
    render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    fireEvent.click(checkboxFor(s1Full));
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
  });

  it("checking a non-current step leaves the pointer, and advance skips it later", async () => {
    render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    fireEvent.click(checkboxFor(s2Full));
    expect(currentText()).toMatch(S1_TEXT);
    fireEvent.click(checkboxFor(s1Full));
    await waitFor(() => expect(currentText()).toMatch(S3_TEXT));
  });

  it("unchecking a done step never moves the pointer", async () => {
    render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    fireEvent.click(checkboxFor(s1Full));
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
    fireEvent.click(checkboxFor(s1Full));
    expect(currentText()).toMatch(S2_TEXT);
  });

  it("tapping a step's text moves the pointer there (§6.7 manual move)", async () => {
    render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    fireEvent.click(
      screen.getByRole("button", { name: /^Defeat Vault Warden/ }),
    );
    await waitFor(() => expect(currentText()).toMatch(WARDEN_TEXT));
  });

  it("the pointer survives a remount (stored, not derived)", async () => {
    const first = render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    fireEvent.click(checkboxFor(s1Full));
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
    first.unmount();
    render(<GuideScreen entry={entry} guide={guide} />);
    await waitFor(() => expect(currentText()).toMatch(S2_TEXT));
  });

  it("renders chapter intros, visit location headings, and missable treatment", async () => {
    render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    expect(screen.getByText(/The road ends at the portcullis/)).toBeDefined();
    // Visits are headed by their location name (sections are gone in v1),
    // which links to the place screen (#8, reachable from navigation).
    const placeLink = screen.getByRole("link", { name: "Castle Gate" });
    expect(placeLink.getAttribute("href")).toBe(
      "#/guide/fictional-quest/place/castle-gate",
    );
    expect(screen.getAllByText(/missable/i).length).toBeGreaterThan(0);
  });
});
