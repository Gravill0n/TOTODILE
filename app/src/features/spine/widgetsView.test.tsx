// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeProgressDb } from "@/features/progress/progressStore";
import { renderGuideAt, stubGuideContent } from "@/testing/renderRoute";

const S1_TEXT = /Talk to gatekeeper ×2/;
const DIVE_TEXT = /Dive at buoy/;
// The vault's first visit — chapter 2, where the location-scoped map lives.
const VAULT = "/chapter/c2/visit/v-sunken-vault-1";

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await closeProgressDb();
  await deleteDB("totodile");
});

// Widget scope follows the URL, not the pointer (FR-A5, amended 2026-07-31):
// the rail is about the page you are reading. These render at the pointer's
// own visit, where the two agree.
const renderGuide = async () => {
  stubGuideContent();
  renderGuideAt("fictional-quest");
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

  it("browsing to the Sunken Vault reveals its location-scoped map — pointer untouched", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", VAULT);
    await screen.findByText(DIVE_TEXT);
    // The pointer is still on chapter 1's first step: nothing here has been
    // checked and nothing was clicked. Walking into the vault to read about it
    // is enough to bring its map, and to drop the chapter-1 checklist —
    // widgets belong to the page, not to the bookmark.
    await waitFor(() => {
      expect(screen.getAllByText("Vault shard locations")).not.toHaveLength(0);
    });
    expect(screen.queryByText("Castle treasure checklist")).toBeNull();
    // …and the pointer really did stay behind: the breadcrumb reads "step N
    // of M" only while the pointer is on this page, and here it is not.
    expect(screen.queryByText(/step \d+ of/)).toBeNull();
  });

  it("moving the pointer alone does not change the rail", async () => {
    stubGuideContent();
    renderGuideAt("fictional-quest", VAULT);
    await screen.findByText(DIVE_TEXT);
    fireEvent.click(screen.getByRole("button", { name: /^Dive at buoy/ }));
    // Same page, so the same widgets — the pointer moving to this visit adds
    // nothing and, more to the point, takes nothing away.
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

  // Opening a widget in place, rather than over the guide, is covered by
  // widgetStack.test.tsx — the launcher-and-dialog pair it replaced is gone.

  it("counter values persist across a remount (FR-B3)", async () => {
    await renderGuide();
    fireEvent.click(
      screen.getByRole("button", { name: /^Collectible counters/ }),
    );
    fireEvent.click(
      (await screen.findAllByLabelText("Increment Blue coins"))[0] as Element,
    );
    await waitFor(() => {
      expect(screen.getAllByText("1 / 40")).not.toHaveLength(0);
    });
    cleanup();

    await renderGuide();
    fireEvent.click(
      screen.getByRole("button", { name: /^Collectible counters/ }),
    );
    await waitFor(() => {
      expect(screen.getAllByText("1 / 40")).not.toHaveLength(0);
    });
  });

  it("toggling a checklist row in the stack marks it done", async () => {
    await renderGuide();
    fireEvent.click(
      screen.getByRole("button", { name: /^Castle treasure checklist/ }),
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
