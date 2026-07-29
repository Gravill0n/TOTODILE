import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { ImageRef } from "@/schema";
import type { MapView } from "@/types/mapView";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const STEP = 0.2;

type MapPanelProps = {
  locationName: string;
  image?: ImageRef | undefined;
  resolveAsset: (path: string) => string;
  view: MapView;
  onViewChange: (view: MapView) => void;
};

// Where the box is scrolled, as a fraction of how far it *can* scroll. Stored
// that way rather than in pixels because this panel is a ~320px column on
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

const round = (zoom: number) => Math.round(zoom * 10) / 10;

// The top of the right column: the map of the place you are standing in, at
// whatever zoom and corner you left it. Zoom is applied as the image's *width*
// so the surrounding box does the scrolling — a transform would need its own
// pan plumbing and would blur the pixel art on the way.
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
  const boxRef = useRef<HTMLDivElement>(null);
  // Declared above the no-map early return — every hook has to run on every
  // render, whether or not there is a map to show.
  const settleRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { zoom, panX, panY } = view;

  // Restore the corner after every zoom change: growing the image moves the
  // scrollable extent under the same fraction.
  useEffect(() => {
    const box = boxRef.current;
    if (box === null) return;
    box.scrollLeft = panOffset(panX, box.scrollWidth, box.clientWidth);
    box.scrollTop = panOffset(panY, box.scrollHeight, box.clientHeight);
  }, [panX, panY]);

  if (!image) return null;

  const zoomTo = (next: number) =>
    onViewChange({
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, round(next))),
      panX,
      panY,
    });

  // Reading the box on every scroll event would write to IndexedDB on every
  // frame of a flick; one write once the scrolling settles is enough.
  const handleScroll = () => {
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(() => {
      const box = boxRef.current;
      if (box === null) return;
      onViewChange({
        zoom,
        panX: panFraction(box.scrollLeft, box.scrollWidth, box.clientWidth),
        panY: panFraction(box.scrollTop, box.scrollHeight, box.clientHeight),
      });
    }, 200);
  };

  const control = (
    label: string,
    glyph: React.ReactNode,
    onClick: () => void,
  ) => (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {glyph}
    </Button>
  );

  return (
    <section className="border-b border-line px-1 pb-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] tracking-eyebrow text-ink-soft uppercase">
          Map
        </span>
        <span className="min-w-0 truncate text-xs">{locationName}</span>
        <span className="ms-auto flex shrink-0 items-center gap-1">
          {control("Zoom out", <ZoomOut aria-hidden />, () =>
            zoomTo(zoom - STEP),
          )}
          <span className="w-9 text-center font-mono text-[11px] text-ink-soft tabular-nums">
            {`${Math.round(zoom * 100)}%`}
          </span>
          {control("Zoom in", <ZoomIn aria-hidden />, () =>
            zoomTo(zoom + STEP),
          )}
          {control("Reset zoom", <RotateCcw aria-hidden />, () =>
            onViewChange({ zoom: MIN_ZOOM, panX: 0, panY: 0 }),
          )}
        </span>
      </div>
      <div
        ref={boxRef}
        onScroll={handleScroll}
        className="h-59 overflow-auto rounded-sm border border-line bg-paper"
      >
        <img
          src={resolveAsset(image.src)}
          alt={image.alt}
          style={{ width: `${zoom * 100}%` }}
          className="block max-w-none [image-rendering:pixelated]"
        />
      </div>
      <p className="mt-1.5 text-[10px] text-ink-soft">
        {locationName}
        {image.credit ? ` — ${image.credit}` : ""} · zoom is remembered
      </p>
    </section>
  );
}
