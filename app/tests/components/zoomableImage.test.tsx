// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ZoomableImage } from "../../src/components/ZoomableImage";

afterEach(cleanup);

function renderImage(overlay?: React.ReactNode) {
  render(
    <ZoomableImage
      src="guides/fictional-quest/images/castle-gate.png"
      alt="Castle gate map"
      caption="The castle gate at dawn"
      credit="Fictional Wiki"
      overlay={overlay}
    />,
  );
}

// The transformed layer rzpp scales — its style carries the current scale.
function transformLayer(): HTMLElement {
  const layer = document.querySelector(".react-transform-component");
  if (!(layer instanceof HTMLElement)) throw new Error("no transform layer");
  return layer;
}

describe("ZoomableImage (Build 3)", () => {
  it("opens the lightbox on tap and closes back", () => {
    renderImage();
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Castle gate map/ }));
    expect(
      document.querySelector('[data-slot="dialog-content"]'),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
  });

  it("zooms in, out, and resets via the controls", () => {
    renderImage();
    fireEvent.click(screen.getByRole("button", { name: /Castle gate map/ }));
    expect(transformLayer().style.transform).toContain("scale(1)");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const zoomed = transformLayer().style.transform;
    expect(zoomed).not.toContain("scale(1)");
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
    expect(transformLayer().style.transform).toContain("scale(1)");
  });

  it("shows caption and credit in the lightbox", () => {
    renderImage();
    fireEvent.click(screen.getByRole("button", { name: /Castle gate map/ }));
    expect(screen.getByText("The castle gate at dawn")).toBeDefined();
    expect(screen.getByText(/Fictional Wiki/)).toBeDefined();
  });

  it("renders the overlay inside the zoom layer so markers track the image", () => {
    renderImage(<span data-testid="pin" />);
    fireEvent.click(screen.getByRole("button", { name: /Castle gate map/ }));
    // One overlay copy inline, one inside the transformed layer.
    const pins = screen.getAllByTestId("pin");
    expect(pins).toHaveLength(2);
    expect(
      pins.some((pin) => pin.closest(".react-transform-component") !== null),
    ).toBe(true);
  });
});
