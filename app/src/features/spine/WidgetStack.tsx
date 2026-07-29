import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { WidgetRenderer } from "@/components/primitives/WidgetRenderer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Widget, WidgetScope } from "@/schema";
import { idTail } from "@/schema";
import type { ProgressSlice } from "@/types/progressSlice";

export type WidgetHandlers = {
  onToggle: (itemId: string) => void;
  onAdjustCounter: (itemId: string, delta: number) => void;
  onResetCounter: (itemId: string) => void;
  resolveAsset: (path: string) => string;
};

type WidgetStackProps = WidgetHandlers & {
  widgets: Widget[];
  progress: ProgressSlice;
  /** Names places and chapters, so a scope label can read as prose. */
  labelForScope?: (scope: WidgetScope) => string;
  emptyLabel?: string;
};

// What a widget is bound to, in words. A stack mixing global reference with
// this-chapter and this-room tables needs to say which is which, or the player
// cannot tell why one disappeared when the pointer moved.
export function scopeLabel(
  scope: WidgetScope,
  nameOf?: (scope: WidgetScope) => string,
): string {
  if (scope.kind === "global") return "Global";
  const name = nameOf?.(scope);
  const noun = scope.kind === "chapter" ? "Chapter" : "Location";
  if (scope.kind === "visit") return `Visit · ${name ?? idTail(scope.visitId)}`;
  return `${noun} · ${name ?? ""}`.trim();
}

// A column of widget cards, each opening in place (§7 S3). The rails used to
// be launcher strips whose buttons opened a modal *over* the guide — the
// design note was blunt about it: "widgets are not easily accessible". Opening
// where the card sits keeps the spine on screen beside the table you came to
// read.
//
// Used by both postures: the desktop right column and the phone sheet render
// the same stack from the same in-scope list (widgetScope resolves it upstream).
export function WidgetStack({
  widgets,
  progress,
  labelForScope,
  emptyLabel = "Nothing in scope",
  ...handlers
}: WidgetStackProps) {
  if (widgets.length === 0) {
    return <p className="text-xs text-ink-soft">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-2">
      {widgets.map((widget) => (
        <WidgetCard
          key={widget.id}
          widget={widget}
          progress={progress}
          label={scopeLabel(widget.scope, labelForScope)}
          {...handlers}
        />
      ))}
    </div>
  );
}

function WidgetCard({
  widget,
  progress,
  label,
  ...handlers
}: WidgetHandlers & {
  widget: Widget;
  progress: ProgressSlice;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-sm border border-line bg-card"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {widget.title}
          </span>
          <span className="block truncate text-[10px] tracking-eyebrow text-ink-soft uppercase">
            {label}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-line p-3">
          <WidgetRenderer widget={widget} progress={progress} {...handlers} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
