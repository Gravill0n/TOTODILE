import type { ProgressSlice } from "../../progress/progressSlice";
import type { PrepCardWidget } from "../../schema";
import { FlagMark } from "../FlagMark";

type PrepCardProps = {
  widget: PrepCardWidget;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
};

// §7 S3: the loadout you gather before a boss / point of no return. A readiness
// summary gives the glanceable "am I prepared" sense (P3 spirit); items render
// as quantity-badged rows. Full version of the §9.3 degraded list — guide data
// is untouched by the upgrade (§9.2 #4).
export function PrepCard({ widget, progress, onToggle }: PrepCardProps) {
  const doneCount = widget.items.filter((item) =>
    progress.doneIds.has(item.itemId),
  ).length;
  const ready = doneCount === widget.items.length;

  return (
    <div>
      <p
        className={`mb-2 text-xs font-bold ${ready ? "text-accent" : "text-ink-soft"}`}
      >
        Ready {doneCount} / {widget.items.length}
        {ready ? " ✓" : null}
      </p>
      <ul className="space-y-1 text-sm">
        {widget.items.map((item) => {
          const done = progress.doneIds.has(item.itemId);
          return (
            <li key={item.itemId}>
              <label className="flex min-h-11 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => onToggle(item.itemId)}
                  aria-label={item.label}
                  className="size-4 shrink-0 accent-accent"
                />
                {item.quantity !== undefined ? (
                  <span className="shrink-0 rounded border border-line px-1 text-xs font-bold">
                    ×{item.quantity}
                  </span>
                ) : null}
                <span className={done ? "line-through opacity-60" : ""}>
                  {item.label}
                  {item.confidence === "flagged" ? (
                    <>
                      {" "}
                      <FlagMark />
                    </>
                  ) : null}
                  {item.note ? (
                    <span className="block text-xs text-ink-soft">
                      {item.note}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
