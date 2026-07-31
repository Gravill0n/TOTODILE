import { useEffect, useRef, useState } from "react";
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import { PinOverlay } from "@/components/primitives/mapPins/PinOverlay";
import type { PinLike } from "@/components/primitives/mapPins/pinClusters";
import type { ImageRef } from "@/schema";
import type { MapView } from "@/types/mapView";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type MapPanelProps = {
  locationName: string;
  /** Every map for this place, in spine order; the first is what opens. */
  images: readonly ImageRef[];
  resolveAsset: (path: string) => string;
  /** Where a given map was last left — keyed by its own src, not by place. */
  viewOf: (src: string) => MapView;
  onViewChange: (src: string, view: MapView) => void;
  /**
   * The pins drawn on a given map, from the mapPins widgets scoped to this
   * place. Same itemIds as the widget card: one progress store, so ticking a
   * pin here strikes the same row through there.
   */
  pinsFor?: (src: string) => readonly PinLike[];
  doneIds?: ReadonlySet<string>;
  onTogglePin?: (itemId: string) => void;
};

const FIT: MapView = { zoom: MIN_ZOOM, panX: 0, panY: 0 };

// What a map is called on its tab. The authored caption if there is one, then
// alt text; the numbered fallback is for a map whose alt reads like a sentence
// about the whole place rather than a name for this sheet.
export function mapLabel(image: ImageRef, index: number): string {
  const label = image.caption ?? image.alt;
  return label.length > 0 && label.length <= 28 ? label : `Map ${index + 1}`;
}

// Where the map is held, as a fraction of how far it *can* be moved. Stored
// that way rather than in pixels because this panel is a resizable column on
// desktop and full width on a phone: the same pixel offset would land on a
// different part of the map on the other posture.
export function panFraction(
  offset: number,
  content: number,
  viewport: number,
): number {
  const extent = content - viewport;
  return extent <= 0 ? 0 : offset / extent;
}

export function panOffset(
  fraction: number,
  content: number,
  viewport: number,
): number {
  const extent = content - viewport;
  return extent <= 0 ? 0 : fraction * extent;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// The top of the right column: the map of the place you are standing in, at
// whatever zoom and corner you left it.
//
// Driven by hand rather than by buttons — wheel to zoom, drag to move,
// double-click back to fit. It is what every other map does, and the three
// 28px controls it replaces were spending the panel's scarcest resource, its
// width, on saying so.
//
// A place with no map renders nothing. An empty framed panel saying "no map"
// is worse than the space it would occupy.
export function MapPanel({
  locationName,
  images,
  resolveAsset,
  viewOf,
  onViewChange,
  pinsFor,
  doneIds,
  onTogglePin,
}: MapPanelProps) {
  const settleRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const appliedRef = useRef<string | null>(null);
  // Which of the place's maps is on screen. Local state, not an address: a
  // floor is a detail of looking at a place, not somewhere you are.
  const [selected, setSelected] = useState(0);
  const image = images[selected] ?? images[0];
  const { zoom, panX, panY } = image ? viewOf(image.src) : FIT;
  // The readout follows the gesture, not the record: the write is debounced,
  // so reading `zoom` here would leave the percentage stuck at its old value
  // for the whole of a scroll and make a smooth zoom look like a jump.
  const [liveZoom, setLiveZoom] = useState(zoom);
  useEffect(() => setLiveZoom(zoom), [zoom]);

  // Every hook runs before the no-map return: the panel disappears entirely
  // for a place without one, and a conditional hook would be a different
  // component each render.
  useEffect(() => () => clearTimeout(settleRef.current), []);

  if (!image) return null;

  // The stored view is a fraction, and a fraction of something only known once
  // the panel has been measured — so it is applied on init rather than handed
  // over as an initial transform. Once, guarded: re-applying would fight the
  // reader mid-gesture, because every gesture writes back through `remember`.
  const applyStoredView = (ref: ReactZoomPanPinchRef) => {
    // Guarded per map, not once per panel: the wrapper remounts on a switch
    // (it is keyed by src below) and each sheet has its own stored corner.
    if (appliedRef.current === image.src) return;
    appliedRef.current = image.src;
    const wrapper = ref.instance.wrapperComponent;
    if (!wrapper || zoom === MIN_ZOOM) return;
    const { offsetWidth: w, offsetHeight: h } = wrapper;
    ref.setTransform(
      -panOffset(panX, w * zoom, w),
      -panOffset(panY, h * zoom, h),
      zoom,
      0,
    );
  };

  const pins = pinsFor?.(image.src) ?? [];

  // A gesture is a stream of transforms — onTransform fires on every frame of
  // one — so the write waits for it to settle.
  const remember = (ref: ReactZoomPanPinchRef) => {
    setLiveZoom(ref.state.scale);
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      const wrapper = ref.instance.wrapperComponent;
      if (!wrapper) return;
      const { scale, positionX, positionY } = ref.state;
      const { offsetWidth: w, offsetHeight: h } = wrapper;
      onViewChange(image.src, {
        zoom: clamp(scale, MIN_ZOOM, MAX_ZOOM),
        panX: clamp(panFraction(-positionX, w * scale, w), 0, 1),
        panY: clamp(panFraction(-positionY, h * scale, h), 0, 1),
      });
    }, 200);
  };

  return (
    <section className="flex h-full flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <span className="text-[11px] tracking-eyebrow text-ink-soft uppercase">
          Map
        </span>
        <span className="min-w-0 truncate text-xs">{locationName}</span>
        {images.length > 1 ? (
          <span className="shrink-0 font-mono text-[10px] text-ink-soft tabular-nums">
            {`${selected + 1}/${images.length}`}
          </span>
        ) : null}
        {/* A readout, not a control — the gestures are the controls now. */}
        <span className="ms-auto shrink-0 font-mono text-[11px] text-ink-soft tabular-nums">
          {`${Math.round(liveZoom * 100)}%`}
        </span>
      </div>
      {/* One sheet per map, only when there is a choice to make. A place can
          hold nine (Tin Tower), so the strip scrolls rather than wrapping into
          three rows and eating the map it labels. */}
      {images.length > 1 ? (
        <div
          role="tablist"
          aria-label={`Maps of ${locationName}`}
          className="mb-2 flex shrink-0 gap-1 overflow-x-auto pb-0.5"
        >
          {images.map((candidate, index) => (
            <button
              key={candidate.src}
              type="button"
              role="tab"
              aria-selected={index === selected}
              onClick={() => setSelected(index)}
              className={`shrink-0 rounded-sm border px-2 py-1 text-[11px] ${
                index === selected
                  ? "border-primary text-primary"
                  : "border-line text-ink-soft"
              }`}
            >
              {mapLabel(candidate, index)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden rounded-sm border border-line bg-paper">
        <TransformWrapper
          // Keyed by the map on screen: a switch remounts the zoom wrapper, so
          // the new sheet starts from its OWN stored corner instead of
          // inheriting the previous map's transform.
          key={image.src}
          minScale={MIN_ZOOM}
          maxScale={MAX_ZOOM}
          limitToBounds
          centerZoomedOut
          // No `wheel.step` override. The library's default is 0.015 per wheel
          // event, and a wheel fires many events per notch — 0.15 made a
          // single scroll cross the whole 100–400% range, so the map read as
          // either untouched or fully zoomed with nothing in between.
          doubleClick={{ mode: "reset" }}
          onInit={applyStoredView}
          onTransform={remember}
        >
          <TransformComponent
            wrapperClass="!h-full !w-full cursor-grab"
            contentClass="!w-full"
          >
            {/* Relative, so the pins' fractional coordinates are fractions
                OF THE IMAGE — and because the overlay lives inside the
                transform, they stay on their landmarks at any zoom. */}
            <div className="relative w-full">
              <img
                src={resolveAsset(image.src)}
                alt={image.alt}
                className="block w-full [image-rendering:pixelated]"
              />
              {pins.length > 0 && doneIds && onTogglePin ? (
                <PinOverlay
                  pins={pins}
                  doneIds={doneIds}
                  onToggle={onTogglePin}
                />
              ) : null}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
      <p className="mt-1.5 shrink-0 text-[10px] text-ink-soft">
        {locationName}
        {image.credit ? ` — ${image.credit}` : ""} · zoom is remembered
      </p>
    </section>
  );
}
