// @vitest-environment jsdom
import "fake-indexeddb/auto";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { readFixtureJson } from "@/testing/fixtureRepo";
import { closeProgressDb } from "../../src/progress/progressStore";
import { guideFile, libraryManifest } from "../../src/schema";
import { GuideScreen } from "../../src/shell/GuideScreen";

const guide = guideFile.parse(
  readFixtureJson("guides/fictional-quest/guide.json"),
);
const entry = libraryManifest.parse(readFixtureJson("library.json")).guides[0];
if (!entry) throw new Error("fixture library has no entry");

const S1_TEXT = /Talk to gatekeeper ×2/;

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

  it("moving the pointer into the Sunken Vault reveals its location-scoped map", async () => {
    await renderGuide();
    // The vault map is scoped to the Sunken Vault location; moving the pointer
    // to a step there reveals it and drops the chapter-1 checklist.
    fireEvent.click(screen.getByRole("button", { name: /^Dive at buoy/ }));
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

  it("a rail launcher opens the widget full-size in a dialog", async () => {
    await renderGuide();
    fireEvent.click(screen.getByRole("button", { name: "Bestiary" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Bestiary")).toBeDefined();
    // The body renders live inside the dialog, not in the rail.
    expect(within(dialog).getByText("HP")).toBeDefined();
  });

  it("counter values persist across a remount (FR-B3)", async () => {
    const first = render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    fireEvent.click(
      screen.getByRole("button", { name: "Collectible counters" }),
    );
    fireEvent.click(
      (await screen.findAllByLabelText("Increment Blue coins"))[0] as Element,
    );
    await waitFor(() => {
      expect(screen.getAllByText("1 / 40")).not.toHaveLength(0);
    });
    first.unmount();
    render(<GuideScreen entry={entry} guide={guide} />);
    await screen.findByText(S1_TEXT);
    fireEvent.click(
      screen.getByRole("button", { name: "Collectible counters" }),
    );
    await waitFor(() => {
      expect(screen.getAllByText("1 / 40")).not.toHaveLength(0);
    });
  });

  it("toggling a checklist row in the dialog marks it done", async () => {
    await renderGuide();
    fireEvent.click(
      screen.getByRole("button", { name: "Castle treasure checklist" }),
    );
    const checkbox = (
      await screen.findAllByLabelText("Gate key")
    )[0] as HTMLElement;
    fireEvent.click(checkbox);
    await waitFor(() => {
      // shadcn Checkbox is a button[role=checkbox]; done state is aria-checked.
      expect(
        screen.getAllByLabelText("Gate key")[0]?.getAttribute("aria-checked"),
      ).toBe("true");
    });
  });
});
