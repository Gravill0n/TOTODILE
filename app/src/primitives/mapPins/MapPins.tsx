import type { ProgressSlice } from "../../progress/progressSlice";
import type { MapPinsWidget } from "../../schema";
import { FlagMark } from "../FlagMark";

type MapPinsProps = {
  widget: MapPinsWidget;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
  // Image srcs are guide-folder-relative; resolution stays outside the
  // renderer (§22.1 purity).
  resolveAsset: (path: string) => string;
};

// §7 S3: pins sit on the map at their authored fractional coordinates, so the
// image can render at any size. Each pin is a tappable marker; a numbered
// legend below repeats the labels for readability. Full version of the §9.3
// degraded list — guide data is untouched by the upgrade (§9.2 #4).
export function MapPins({
  widget,
  progress,
  onToggle,
  resolveAsset,
}: MapPinsProps) {
  return (
    <div>
      <div className="relative">
        <img
          src={resolveAsset(widget.image.src)}
          alt={widget.image.alt}
          className="w-full rounded border border-line"
        />
        {widget.pins.map((pin, index) => {
          const done = progress.doneIds.has(pin.itemId);
          return (
            <button
              key={pin.itemId}
              type="button"
              onClick={() => onToggle(pin.itemId)}
              aria-label={pin.label}
              aria-pressed={done}
              style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
              className={`absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold ${
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary bg-card/90 text-primary"
              }`}
            >
              {done ? "✓" : index + 1}
            </button>
          );
        })}
      </div>
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
