// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PostureLayout } from "@/features/spine/PostureLayout";

afterEach(cleanup);

const EMOJI = ["☰", "🧩", "📍", "🔄"];

function renderNav(props = {}) {
  return render(
    <PostureLayout
      onChapters={() => {}}
      onWidgets={() => {}}
      onWhereAmI={() => {}}
      onSync={() => {}}
      {...props}
    >
      <p>play area</p>
    </PostureLayout>,
  );
}

describe("PostureLayout bottom nav (R1)", () => {
  it("fires each action and keeps its title affordance", () => {
    const onChapters = vi.fn();
    const onWidgets = vi.fn();
    const onWhereAmI = vi.fn();
    const onSync = vi.fn();
    renderNav({ onChapters, onWidgets, onWhereAmI, onSync });

    fireEvent.click(screen.getByTitle("Chapters"));
    fireEvent.click(screen.getByTitle("Widgets"));
    fireEvent.click(screen.getByTitle("Where am I"));
    fireEvent.click(screen.getByTitle("Sync"));

    expect(onChapters).toHaveBeenCalledOnce();
    expect(onWidgets).toHaveBeenCalledOnce();
    expect(onWhereAmI).toHaveBeenCalledOnce();
    expect(onSync).toHaveBeenCalledOnce();
  });

  it("renders lucide icons, not emoji", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    // Four lucide glyphs, one per action.
    expect(nav?.querySelectorAll("svg").length).toBe(4);
    for (const glyph of EMOJI) {
      expect(nav?.textContent ?? "").not.toContain(glyph);
    }
  });

  it("disables an action whose handler is absent", () => {
    renderNav({ onWidgets: undefined });
    expect((screen.getByTitle("Widgets") as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByTitle("Chapters") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("shows a spinning sync and disables it while syncing", () => {
    const onSync = vi.fn();
    renderNav({ onSync, syncing: true });
    const sync = screen.getByTitle("Syncing…") as HTMLButtonElement;
    expect(sync.disabled).toBe(true);
    expect(sync.querySelector("svg")?.getAttribute("class") ?? "").toContain(
      "animate-spin",
    );
    fireEvent.click(sync);
    expect(onSync).not.toHaveBeenCalled();
  });
});

// Design v2 turns the browse posture into three real columns: chapters on the
// left, the visit in the middle, map and widgets on the right — not two 160px
// launcher strips flanking a page of spine.
describe("PostureLayout browse posture", () => {
  it("lays the columns out at the prototype's widths, full bleed", () => {
    const { container } = renderNav();
    // Guide.dc.html: grid-template-columns:248px minmax(0,1fr) 352px.
    expect(
      container.querySelector(
        '[class*="lg:grid-cols-[248px_minmax(0,1fr)_352px]"]',
      ),
    ).not.toBeNull();
    // Nothing is centred in a fixed measure — the rails hold the edges.
    expect(container.querySelector('[class*="max-w-"]')).toBeNull();
    // One breakpoint, still: below lg the rails are gone and the bottom bar
    // is the navigation.
    for (const label of ["Chapters", "Map and widgets"]) {
      expect(screen.getByLabelText(label).className).toContain("hidden");
    }
  });

  it("sets the chrome apart from the column being read", () => {
    renderNav({ header: <p>guide header</p> });
    // The chrome is on card, the visit on paper (the page background).
    const bar = screen.getByText("guide header").closest("header");
    expect(bar?.className).toContain("bg-card");
    for (const label of ["Chapters", "Map and widgets"]) {
      expect(screen.getByLabelText(label).className).toContain("bg-card");
    }
  });

  it("scrolls each column, never the window", () => {
    const { container } = renderNav();
    // The desktop shell is exactly one viewport tall and clips: the header
    // holds its row and the three columns scroll inside it, so a rail can
    // never slide away from the visit it describes.
    const shell = container.firstElementChild;
    expect(shell?.className).toContain("lg:h-dvh");
    expect(shell?.className).toContain("lg:overflow-hidden");
    for (const label of ["Chapters", "Map and widgets"]) {
      expect(screen.getByLabelText(label).className).toContain(
        "overflow-y-auto",
      );
    }
    expect(screen.getByText("play area").closest("main")?.className).toContain(
      "lg:overflow-y-auto",
    );
  });
});
