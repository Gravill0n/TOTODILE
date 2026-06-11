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

// §9.3 degraded list — the plain map image with the pins as a checklist
// below it. Positioned pins arrive in Phase 5.
export function MapPins({
  widget,
  progress,
  onToggle,
  resolveAsset,
}: MapPinsProps) {
  return (
    <div>
      <img
        src={resolveAsset(widget.image.src)}
        alt={widget.image.alt}
        className="mb-2 w-full rounded border border-line"
      />
      <ul className="space-y-1 text-sm">
        {widget.pins.map((pin) => {
          const done = progress.doneIds.has(pin.itemId);
          return (
            <li key={pin.itemId} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={done}
                onChange={() => onToggle(pin.itemId)}
                aria-label={pin.label}
                className="mt-0.5 size-4 shrink-0 accent-accent"
              />
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
      </ul>
    </div>
  );
}
