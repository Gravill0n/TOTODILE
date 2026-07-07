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
import { closeProgressDb, readSlot } from "@/features/progress/progressStore";
import { guideFile, libraryManifest } from "@/schema";
import { GuideScreen } from "@/shell/GuideScreen";
import { readFixtureJson } from "@/testing/fixtureRepo";

const guide = guideFile.parse(
  readFixtureJson("guides/fictional-quest/guide.json"),
);
const entry = libraryManifest.parse(readFixtureJson("library.json")).guides[0];
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
