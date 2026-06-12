// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { closeProgressDb } from "../../src/progress/progressStore";
import { guideFile, libraryManifest } from "../../src/schema";
import { GuideScreen } from "../../src/shell/GuideScreen";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "repo",
);
const readJson = (path: string) =>
  JSON.parse(readFileSync(join(fixtureRoot, path), "utf8"));

const guide = guideFile.parse(readJson("guides/fictional-quest/guide.json"));
const entry = libraryManifest.parse(readJson("library.json")).guides[0];
if (!entry) throw new Error("fixture library has no entry");

const S1_TEXT = /Talk to the gatekeeper twice/;
const S2_TEXT = /Pry the Old Coin/;
const S3_TEXT = /Beat the Sentry Captain/;
const WARDEN_TEXT = /Defeat the Vault Warden/;

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

const s1Full =
  "Talk to the gatekeeper twice; he hands over the rusty lantern you need for the cellar.";
const s2Full =
  "Pry the Old Coin from behind the loose brick left of the portcullis.";

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
      screen.getByRole("button", { name: /^Defeat the Vault Warden/ }),
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

  it("renders chapter intros, section headings, and missable treatment", async () => {
    render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    expect(screen.getByText(/The road ends at the portcullis/)).toBeDefined();
    expect(screen.getByText("1.1 · Outside the Walls")).toBeDefined();
    expect(screen.getAllByText(/missable/i).length).toBeGreaterThan(0);
  });
});
