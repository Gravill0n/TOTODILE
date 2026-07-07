// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapPins } from "@/components/primitives/mapPins/MapPins";
import { mapPinsWidget, step as stepSchema } from "@/schema";
import { StepRow } from "@/spine/StepRow";

afterEach(cleanup);

const noop = () => {};

const map = mapPinsWidget.parse({
  id: "fictional-quest:w6",
  type: "mapPins",
  title: "Shard locations",
  scope: { kind: "global" },
  deckPosition: 5,
  image: { src: "images/vault-map.png", alt: "Map of the Sunken Vault" },
  pins: [
    {
      itemId: "fictional-quest:w6:shard-east",
      label: "Shard — east alcove",
      x: 0.78,
      y: 0.41,
      sourceRefs: ["src-wiki"],
      confidence: "normal",
    },
  ],
});

describe("zoom wiring (Build 3, Task 3.2)", () => {
  it("MapPins opens the zoom lightbox with pins overlaid on the zoom layer", () => {
    render(
      <MapPins
        widget={map}
        progress={{ doneIds: new Set(), counterValues: {} }}
        onToggle={vi.fn()}
        resolveAsset={(path) => `guides/fictional-quest/${path}`}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Zoom: Map of the Sunken Vault" }),
    );
    expect(
      document.querySelector('[data-slot="dialog-content"]'),
    ).not.toBeNull();
    // The pin renders in the transformed layer too, at its authored offset —
    // fractional coords scale with the image, so it stays aligned.
    const pins = screen.getAllByLabelText("Shard — east alcove");
    const zoomed = pins.find(
      (pin) => pin.closest(".react-transform-component") !== null,
    );
    expect(zoomed?.style.left).toBe("78%");
  });

  it("MapPins pins still toggle inline without opening the lightbox", () => {
    const onToggle = vi.fn();
    render(
      <MapPins
        widget={map}
        progress={{ doneIds: new Set(), counterValues: {} }}
        onToggle={onToggle}
        resolveAsset={(path) => path}
      />,
    );
    fireEvent.click(screen.getByLabelText("Shard — east alcove"));
    expect(onToggle).toHaveBeenCalledWith("fictional-quest:w6:shard-east");
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
  });

  it("StepRow images open the zoom lightbox and keep alt text", () => {
    const step = stepSchema.parse({
      id: "g:v1:s1",
      order: 0,
      keywords: ["First beat"],
      images: [
        {
          src: "images/castle-gate.png",
          alt: "Castle gate map",
          caption: "The gate",
          credit: "Wiki",
        },
      ],
      sourceRefs: ["src-x"],
      confidence: "normal",
    });
    render(
      <StepRow
        step={step}
        slug="g"
        isCurrent={true}
        isDone={false}
        isSkipped={false}
        onToggleDone={noop}
        onToggleSkip={noop}
        onMarkThrough={noop}
        onMoveHere={noop}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Zoom: Castle gate map" }),
    );
    expect(
      document.querySelector('[data-slot="dialog-content"]'),
    ).not.toBeNull();
    expect(screen.getByText("The gate")).toBeDefined();
  });
});
