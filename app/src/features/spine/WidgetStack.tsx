import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Pin } from "lucide-react";
import { useState } from "react";
import { WidgetRenderer } from "@/components/primitives/WidgetRenderer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Widget, WidgetScope } from "@/schema";
import { idTail } from "@/schema";
import type { ProgressSlice } from "@/types/progressSlice";
import { arrangeWidgets, canMove, moveWidget } from "./widgetOrder";

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
  /** The arrangement, if this stack is arrangeable. */
  order?: readonly string[];
  pinnedIds?: readonly string[];
  onOrderChange?: (widgetIds: string[]) => void;
  onTogglePin?: (widgetId: string) => void;
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
  if (scope.kind === "visit") return `Visit · ${name ?? idTail(scope.visitId)}`;
  const noun = scope.kind === "chapter" ? "Chapter" : "Location";
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
//
// Reordering is a drag OR a pair of buttons. The buttons are not a fallback —
// they are the accessible path, and on a phone they are the only sane one.
export function WidgetStack({
  widgets,
  progress,
  labelForScope,
  emptyLabel = "Nothing in scope",
  order = [],
  pinnedIds = [],
  onOrderChange,
  onTogglePin,
  ...handlers
}: WidgetStackProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const arranged = arrangeWidgets(widgets, order, pinnedIds);

  if (arranged.length === 0) {
    return <p className="text-xs text-ink-soft">{emptyLabel}</p>;
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !onOrderChange) return;
    const ids = arranged.map((widget) => widget.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    // A drag across the pinned boundary would unpin by accident; the pin
    // button is the only thing that unpins.
    if (
      pinnedIds.includes(ids[from] ?? "") !== pinnedIds.includes(ids[to] ?? "")
    )
      return;
    onOrderChange(arrayMove(ids, from, to));
  };

  const cards = arranged.map((widget) => (
    <WidgetCard
      key={widget.id}
      widget={widget}
      progress={progress}
      label={scopeLabel(widget.scope, labelForScope)}
      pinned={pinnedIds.includes(widget.id)}
      onTogglePin={onTogglePin}
      onMove={
        onOrderChange === undefined
          ? undefined
          : (delta) =>
              onOrderChange(moveWidget(arranged, widget.id, delta, pinnedIds))
      }
      canMoveUp={canMove(arranged, widget.id, -1, pinnedIds)}
      canMoveDown={canMove(arranged, widget.id, 1, pinnedIds)}
      {...handlers}
    />
  ));

  if (onOrderChange === undefined) {
    return <div className="space-y-2">{cards}</div>;
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={arranged.map((widget) => widget.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">{cards}</div>
      </SortableContext>
    </DndContext>
  );
}

function WidgetCard({
  widget,
  progress,
  label,
  pinned,
  onTogglePin,
  onMove,
  canMoveUp,
  canMoveDown,
  ...handlers
}: WidgetHandlers & {
  widget: Widget;
  progress: ProgressSlice;
  label: string;
  pinned: boolean;
  onTogglePin?: (widgetId: string) => void;
  onMove?: (delta: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: widget.id, disabled: onMove === undefined });

  const iconButton = (
    label: string,
    glyph: React.ReactNode,
    onClick: () => void,
    disabled = false,
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${widget.title}`}
      title={label}
      className="grid size-6 shrink-0 place-items-center rounded-sm text-ink-soft disabled:opacity-30"
    >
      {glyph}
    </button>
  );

  return (
    <Collapsible
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "rounded-sm border bg-card",
        pinned ? "border-primary" : "border-line",
      )}
    >
      <div className="flex items-center gap-1 p-3">
        {onMove ? (
          // A real button, not a span with a label: dnd-kit's keyboard sensor
          // drives the drag from focus, so the handle has to be focusable and
          // announce itself as something you can act on.
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder: ${widget.title}`}
            className="cursor-grab text-ink-soft"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        ) : null}
        <CollapsibleTrigger className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-medium">
            {widget.title}
          </span>
          <span className="block truncate text-[10px] tracking-eyebrow text-ink-soft uppercase">
            {label}
          </span>
        </CollapsibleTrigger>
        {onMove ? (
          <>
            {iconButton(
              "Move up",
              <ChevronUp className="size-3.5" aria-hidden />,
              () => onMove(-1),
              !canMoveUp,
            )}
            {iconButton(
              "Move down",
              <ChevronDown className="size-3.5" aria-hidden />,
              () => onMove(1),
              !canMoveDown,
            )}
          </>
        ) : null}
        {onTogglePin ? (
          <button
            type="button"
            onClick={() => onTogglePin(widget.id)}
            aria-pressed={pinned}
            aria-label={`${pinned ? "Unpin" : "Pin"}: ${widget.title}`}
            title={pinned ? "Unpin" : "Pin to the top"}
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-sm",
              pinned ? "text-primary" : "text-ink-soft",
            )}
          >
            <Pin className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <CollapsibleContent>
        <div className="border-t border-line p-3">
          <WidgetRenderer widget={widget} progress={progress} {...handlers} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
