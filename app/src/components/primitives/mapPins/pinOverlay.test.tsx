// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PinOverlay } from "./PinOverlay";

afterEach(cleanup);

const pin = (itemId: string, label: string, x: number, y: number) => ({
  itemId,
  label,
  x,
  y,
});

const stacked = [
  pin("g:w:hp", "Hidden HP Up", 0.4, 0.4),
  pin("g:w:ether", "Ether behind the rock", 0.4, 0.4),
];

function renderOverlay(
  pins = stacked,
  done: string[] = [],
  onToggle = vi.fn(),
) {
  render(
    <PinOverlay pins={pins} doneIds={new Set(done)} onToggle={onToggle} />,
  );
  return onToggle;
}

describe("PinOverlay — pins that share a spot", () => {
  // Crystal has 181 pins sharing a coordinate with another pin. One marker per
  // pin meant the later one covered the earlier, and the buried item could not
  // be reached from the map at all.
  it("draws one marker for a stack, showing how many it holds", () => {
    renderOverlay();
    const markers = screen.getAllByRole("button");
    expect(markers).toHaveLength(1);
    expect(markers[0]?.textContent).toBe("2");
    expect(markers[0]?.getAttribute("aria-label")).toBe("2 pins here — 0 done");
  });

  it("opens the list on tap — no hover, so a phone can reach them", () => {
    renderOverlay();
    expect(screen.queryByText("Ether behind the rock")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Hidden HP Up")).toBeDefined();
    expect(screen.getByText("Ether behind the rock")).toBeDefined();
  });

  it("toggles the buried pin from the list — the whole point", () => {
    const onToggle = renderOverlay();
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Ether behind the rock"));
    expect(onToggle).toHaveBeenCalledWith("g:w:ether");
  });

  it("counts the done ones on the marker's label", () => {
    renderOverlay(stacked, ["g:w:hp"]);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe(
      "2 pins here — 1 done",
    );
  });

  it("closes when the map behind it is tapped", () => {
    renderOverlay();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Hidden HP Up")).toBeDefined();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByText("Hidden HP Up")).toBeNull();
  });

  it("clears 44×44 — the touch target the play posture requires (§5.4)", () => {
    renderOverlay();
    expect(screen.getByRole("button").className).toContain("size-11");
  });
});

describe("PinOverlay — a pin on its own", () => {
  const lone = [pin("g:w:a", "Rare Candy", 0.2, 0.2)];

  it("toggles directly, with no list in the way", () => {
    const onToggle = renderOverlay(lone);
    fireEvent.click(screen.getByRole("button", { name: "Rare Candy" }));
    expect(onToggle).toHaveBeenCalledWith("g:w:a");
  });

  it("shows its legend number, so the map and the list read as one", () => {
    renderOverlay([pin("g:w:z", "Second", 0.9, 0.9), ...lone]);
    expect(screen.getByRole("button", { name: "Rare Candy" }).textContent).toBe(
      "2",
    );
  });

  it("marks a done pin as pressed", () => {
    renderOverlay(lone, ["g:w:a"]);
    expect(
      screen
        .getByRole("button", { name: "Rare Candy" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
});
