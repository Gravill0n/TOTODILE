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
const entries = libraryManifest.parse(readJson("library.json")).guides;
const entry =
  entries[0] ??
  (() => {
    throw new Error("fixture library has no entry");
  })();

const stepText = (chapterIndex: number, stepIndex: number): string => {
  const text = guide.chapters[chapterIndex]?.steps[stepIndex]?.text;
  if (!text) throw new Error("missing fixture step");
  return text;
};
const short = (text: string) => text.slice(0, 40);

const S1 = stepText(0, 0);
const S2 = stepText(0, 1);
const S3 = stepText(0, 2);
const S4 = stepText(0, 3);
const S5 = stepText(0, 4);
const C2S1 = stepText(1, 0);

afterEach(async () => {
  cleanup();
  await closeProgressDb();
  await deleteDB("totodile");
});

const currentText = () =>
  document.querySelector("[data-current]")?.textContent ?? "";

const renderGuide = async () => {
  render(<GuideScreen entry={entry} guide={guide} />);
  await screen.findByText(S1);
};

describe("skip-for-later (FR-B2)", () => {
  it("skipping the current step advances the pointer and flags the row", async () => {
    await renderGuide();
    fireEvent.click(screen.getByLabelText(`Skip for later: ${short(S1)}`));
    await waitFor(() => expect(currentText()).toContain(S2));
    expect(screen.getByText("skipped")).toBeDefined();
    const checkbox = screen.getByLabelText(
      `Done: ${short(S1)}`,
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("checking a skipped step promotes it to done", async () => {
    await renderGuide();
    fireEvent.click(screen.getByLabelText(`Skip for later: ${short(S1)}`));
    await screen.findByText("skipped");
    fireEvent.click(screen.getByLabelText(`Done: ${short(S1)}`));
    await waitFor(() => {
      expect(screen.queryByText("skipped")).toBeNull();
    });
    expect(
      (screen.getByLabelText(`Done: ${short(S1)}`) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("done rows offer no skip action", async () => {
    await renderGuide();
    fireEvent.click(screen.getByLabelText(`Done: ${short(S1)}`));
    await waitFor(() => expect(currentText()).toContain(S2));
    expect(screen.queryByLabelText(`Skip for later: ${short(S1)}`)).toBeNull();
  });

  it("unskipping a non-current step leaves the pointer alone", async () => {
    await renderGuide();
    fireEvent.click(screen.getByLabelText(`Skip for later: ${short(S2)}`));
    await screen.findByText("skipped");
    expect(currentText()).toContain(S1);
    fireEvent.click(screen.getByLabelText(`Unskip: ${short(S2)}`));
    await waitFor(() => {
      expect(screen.queryByText("skipped")).toBeNull();
    });
    expect(currentText()).toContain(S1);
  });
});

describe("burst marking (P2)", () => {
  it("mark-through checks everything up to the tapped step but preserves skips", async () => {
    await renderGuide();
    fireEvent.click(screen.getByLabelText(`Skip for later: ${short(S3)}`));
    await screen.findByText("skipped");
    fireEvent.click(
      screen.getByLabelText(`Mark all through here: ${short(S5)}`),
    );
    await waitFor(() => expect(currentText()).toContain(C2S1));
    for (const text of [S1, S2, S4, S5]) {
      expect(
        (screen.getByLabelText(`Done: ${short(text)}`) as HTMLInputElement)
          .checked,
      ).toBe(true);
    }
    expect(
      (screen.getByLabelText(`Done: ${short(S3)}`) as HTMLInputElement).checked,
    ).toBe(false);
    expect(screen.getByText("skipped")).toBeDefined();
  });
});
