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
  it("gives each rail a name and room to hold something", () => {
    const { container } = renderNav();
    const chapters = screen.getByLabelText("Chapters");
    const reference = screen.getByLabelText("Map and widgets");
    expect(chapters.className).toContain("w-56");
    expect(reference.className).toContain("w-80");
    // One breakpoint, still: below lg the rails are gone and the bottom bar
    // is the navigation.
    for (const rail of [chapters, reference]) {
      expect(rail.className).toContain("hidden");
      expect(rail.className).toContain("lg:block");
    }
    expect(container.querySelector(".max-w-7xl")).not.toBeNull();
  });
});
