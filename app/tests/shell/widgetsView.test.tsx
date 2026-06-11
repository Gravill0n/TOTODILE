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

afterEach(async () => {
  cleanup();
  await closeProgressDb();
  await deleteDB("totodile");
});

const renderGuide = async () => {
  render(<GuideScreen entry={entry} guide={guide} />);
  await screen.findByText(S1_TEXT);
};

describe("widget view (S3)", () => {
  it("filters widgets to the current chapter, global ones always visible (FR-A5)", async () => {
    await renderGuide();
    // Pointer starts in chapter 1: the c1-scoped checklist and the global
    // widgets show; the c2-scoped map pins and prep card do not.
    expect(screen.getAllByText("Castle treasure checklist")).not.toHaveLength(
      0,
    );
    expect(screen.getAllByText("Bestiary")).not.toHaveLength(0);
    expect(screen.queryByText("Vault shard locations")).toBeNull();
    expect(screen.queryByText("Before the Vault Warden")).toBeNull();
  });

  it("the whole-game toggle reveals widgets from other chapters (FR-A5)", async () => {
    await renderGuide();
    fireEvent.click(screen.getAllByLabelText("Whole game")[0] as Element);
    expect(screen.getAllByText("Vault shard locations")).not.toHaveLength(0);
    expect(screen.getAllByText("Before the Vault Warden")).not.toHaveLength(0);
  });

  it("moving the pointer to chapter 2 switches the chapter context", async () => {
    await renderGuide();
    fireEvent.click(
      screen.getByRole("button", { name: /Defeat the Vault Warden/ }),
    );
    await waitFor(() => {
      expect(screen.getAllByText("Vault shard locations")).not.toHaveLength(0);
    });
    expect(screen.queryByText("Castle treasure checklist")).toBeNull();
  });

  it("🧩 opens the widget sheet", async () => {
    await renderGuide();
    fireEvent.click(screen.getByTitle("Widgets"));
    expect(await screen.findByLabelText("Close widgets")).toBeDefined();
    expect(screen.getAllByText("Widgets")).not.toHaveLength(0);
  });

  it("counter values persist across a remount (FR-B3)", async () => {
    const first = render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    fireEvent.click(
      screen.getAllByLabelText("Increment Blue coins")[0] as Element,
    );
    await waitFor(() => {
      expect(screen.getAllByText("1 / 40")).not.toHaveLength(0);
    });
    first.unmount();
    render(<GuideScreen entry={entry} guide={guide} />);
    await waitFor(() => {
      expect(screen.getAllByText("1 / 40")).not.toHaveLength(0);
    });
  });

  it("toggling a checklist row marks it done in the deck", async () => {
    await renderGuide();
    const checkbox = screen.getAllByLabelText(
      "Gate key",
    )[0] as HTMLInputElement;
    fireEvent.click(checkbox);
    await waitFor(() => {
      expect(
        (screen.getAllByLabelText("Gate key")[0] as HTMLInputElement).checked,
      ).toBe(true);
    });
  });
});
