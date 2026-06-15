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
import { closeProgressDb, readSlot } from "../../src/progress/progressStore";
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

// The fixture's first missable: step c1:s2, ahead of the landing step c1:s1.
const C1S2 = "fictional-quest:c1:s2";
const ACK = /Acknowledge missable: Before opening the gate/;

afterEach(async () => {
  cleanup();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("missable banner (FR-B5)", () => {
  it("warns about an upcoming missable and persists the acknowledgement", async () => {
    render(<GuideScreen entry={entry} guide={guide} />);

    expect(await screen.findByLabelText("Upcoming missables")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: ACK }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: ACK })).toBeNull();
    });
    await waitFor(async () => {
      const slot = await readSlot("fictional-quest");
      expect(slot.acknowledgedMissables).toContain(C1S2);
    });
  });
});
