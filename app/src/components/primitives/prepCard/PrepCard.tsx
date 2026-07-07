import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { PrepCardWidget } from "@/schema";
import { FlagMark } from "../FlagMark";
import type { WidgetProps } from "../widgetProps";

type PrepCardProps = WidgetProps<PrepCardWidget>;

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
        className={cn(
          "mb-2 flex items-center gap-1 text-xs font-bold",
          ready ? "text-primary" : "text-ink-soft",
        )}
      >
        Ready {doneCount} / {widget.items.length}
        {ready ? <Check className="size-3" aria-hidden /> : null}
      </p>
      <ul className="space-y-1 text-sm">
        {widget.items.map((item) => {
          const done = progress.doneIds.has(item.itemId);
          return (
            <li key={item.itemId} className="flex min-h-11 items-center gap-2">
              <Checkbox
                checked={done}
                onCheckedChange={() => onToggle(item.itemId)}
                aria-label={item.label}
              />
              {item.quantity !== undefined ? (
                <Badge variant="outline" className="shrink-0 font-bold">
                  ×{item.quantity}
                </Badge>
              ) : null}
              <span className={cn(done && "line-through opacity-60")}>
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
