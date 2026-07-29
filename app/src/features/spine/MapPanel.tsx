import { useEffect, useRef } from "react";
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import type { ImageRef } from "@/schema";
import type { MapView } from "@/types/mapView";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type MapPanelProps = {
  locationName: string;
  image?: ImageRef | undefined;
  resolveAsset: (path: string) => string;
  view: MapView;
  onViewChange: (view: MapView) => void;
};

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
  image,
  resolveAsset,
  view,
  onViewChange,
}: MapPanelProps) {
  const settleRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const appliedRef = useRef(false);
  const { zoom, panX, panY } = view;

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
    if (appliedRef.current) return;
    appliedRef.current = true;
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

  // A gesture is a stream of transforms — onTransform fires on every frame of
  // one — so the write waits for it to settle.
  const remember = (ref: ReactZoomPanPinchRef) => {
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      const wrapper = ref.instance.wrapperComponent;
      if (!wrapper) return;
      const { scale, positionX, positionY } = ref.state;
      const { offsetWidth: w, offsetHeight: h } = wrapper;
      onViewChange({
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
        {/* A readout, not a control — the gestures are the controls now. */}
        <span className="ms-auto shrink-0 font-mono text-[11px] text-ink-soft tabular-nums">
          {`${Math.round(zoom * 100)}%`}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-sm border border-line bg-paper">
        <TransformWrapper
          minScale={MIN_ZOOM}
          maxScale={MAX_ZOOM}
          limitToBounds
          centerZoomedOut
          wheel={{ step: 0.15 }}
          doubleClick={{ mode: "reset" }}
          onInit={applyStoredView}
          onTransform={remember}
        >
          <TransformComponent
            wrapperClass="!h-full !w-full cursor-grab"
            contentClass="!w-full"
          >
            <img
              src={resolveAsset(image.src)}
              alt={image.alt}
              className="block w-full [image-rendering:pixelated]"
            />
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
