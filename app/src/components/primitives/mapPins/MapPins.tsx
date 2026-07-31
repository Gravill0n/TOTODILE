import { ZoomableImage } from "@/components/ZoomableImage";
import type { MapPinsWidget } from "@/schema";
import { FlagMark } from "../FlagMark";
import type { WidgetProps } from "../widgetProps";
import { PinOverlay } from "./PinOverlay";

type MapPinsProps = WidgetProps<MapPinsWidget> & {
  // Image srcs are guide-folder-relative; resolution stays outside the
  // renderer (§22.1 purity).
  resolveAsset: (path: string) => string;
};

// §7 S3: pins sit on the map at their authored fractional coordinates, so the
// image can render at any size. Each pin is a tappable marker; a numbered
// legend below repeats the labels for readability. Full version of the §9.3
// degraded list — guide data is untouched by the upgrade (§9.2 #4).
// The map opens into the zoom lightbox (#2); the pins ride along as the
// overlay, so their fractional coordinates stay aligned at any zoom level.
export function MapPins({
  widget,
  progress,
  onToggle,
  resolveAsset,
}: MapPinsProps) {
  // The markers are the shared overlay, so the card and the map panel draw
  // pins the same way — including collapsing the ones that share a spot, which
  // in this card used to make the buried pin untappable.
  const pinMarkers = (
    <PinOverlay
      pins={widget.pins}
      doneIds={progress.doneIds}
      {...(progress.highlightIds
        ? { highlightIds: progress.highlightIds }
        : {})}
      onToggle={onToggle}
    />
  );
  return (
    <div>
      <ZoomableImage
        src={resolveAsset(widget.image.src)}
        alt={widget.image.alt}
        caption={widget.image.caption}
        credit={widget.image.credit}
        className="w-full rounded border border-line"
        overlay={pinMarkers}
      />
      <ol className="mt-2 space-y-1 text-sm">
        {widget.pins.map((pin, index) => {
          const done = progress.doneIds.has(pin.itemId);
          return (
            <li key={pin.itemId} className="flex items-start gap-2">
              <span className="w-4 shrink-0 text-xs text-ink-soft">
                {index + 1}.
              </span>
              <span className={done ? "line-through opacity-60" : ""}>
                {pin.label}
                {pin.confidence === "flagged" ? (
                  <>
                    {" "}
                    <FlagMark />
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
