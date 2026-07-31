import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { clusterLabel, clusterPins, type PinLike } from "./pinClusters";

type PinOverlayProps = {
  pins: readonly PinLike[];
  doneIds: ReadonlySet<string>;
  onToggle: (itemId: string) => void;
  /** Legend position of a pin (1-based), so a lone marker shows its number. */
  legendNumberOf?: (itemId: string) => number;
};

// The markers that sit on a map, at their authored fractional coordinates so
// they hold their place at any rendered size or zoom. Shared by the two
// surfaces that draw pins — the mapPins widget card and the map panel — so
// they cannot disagree about what a pin looks like or which of them is done.
//
// Co-located pins collapse into one marker (see pinClusters): tapping it opens
// the list instead of toggling, because there is no single item to toggle.
// Tap, not hover: hover has no touch equivalent, and this is a phone-first
// play view (§5.4). The markers clear 44×44.
export function PinOverlay({
  pins,
  doneIds,
  onToggle,
  legendNumberOf,
}: PinOverlayProps) {
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const clusters = clusterPins(pins);
  const numberOf =
    legendNumberOf ??
    ((itemId: string) => pins.findIndex((pin) => pin.itemId === itemId) + 1);

  // A tap anywhere else closes the open list — including on the map itself,
  // which is the natural "never mind" gesture.
  useEffect(() => {
    if (openCluster === null) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenCluster(null);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [openCluster]);

  return (
    <div ref={rootRef}>
      {clusters.map((cluster) => {
        const key = cluster.pins.map((pin) => pin.itemId).join("|");
        const grouped = cluster.pins.length > 1;
        const done = cluster.pins.filter((pin) => doneIds.has(pin.itemId));
        const allDone = done.length === cluster.pins.length;
        const open = openCluster === key;
        const first = cluster.pins[0];
        if (!first) return null;

        return (
          <div
            key={key}
            style={{ left: `${cluster.x * 100}%`, top: `${cluster.y * 100}%` }}
            className="absolute"
          >
            <button
              type="button"
              onClick={() =>
                grouped
                  ? setOpenCluster(open ? null : key)
                  : onToggle(first.itemId)
              }
              aria-label={
                grouped
                  ? `${cluster.pins.length} pins here — ${done.length} done`
                  : first.label
              }
              aria-expanded={grouped ? open : undefined}
              aria-pressed={grouped ? undefined : doneIds.has(first.itemId)}
              className={cn(
                "flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold",
                allDone
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary bg-card/90 text-primary",
              )}
            >
              {allDone && !grouped ? (
                <Check className="size-5" aria-hidden />
              ) : (
                clusterLabel(cluster, numberOf)
              )}
            </button>

            {/* The list of what is under a grouped marker. Each row toggles
                its own item — the whole point is reaching the pins the top
                marker used to bury. */}
            {open ? (
              <ul className="absolute start-1/2 z-30 mt-1 w-56 -translate-x-1/2 space-y-1 rounded-sm border border-line bg-card p-2 shadow-lg">
                {cluster.pins.map((pin) => {
                  const pinDone = doneIds.has(pin.itemId);
                  return (
                    <li key={pin.itemId}>
                      <button
                        type="button"
                        onClick={() => onToggle(pin.itemId)}
                        aria-pressed={pinDone}
                        className="flex w-full items-start gap-2 py-1 text-start text-xs"
                      >
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-xs border border-primary">
                          {pinDone ? (
                            <Check
                              className="size-3 text-primary"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        <span
                          className={pinDone ? "line-through opacity-60" : ""}
                        >
                          {pin.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
