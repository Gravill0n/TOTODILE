import {
  ClipboardList,
  GitBranch,
  Grid3x3,
  ListChecks,
  type LucideIcon,
  MapPin,
  Table,
  Tally5,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Widget, WidgetType } from "../schema";

// One glyph per primitive — the closed §14.3 set, so the record is exhaustive.
const typeIcons: Record<WidgetType, LucideIcon> = {
  checklist: ListChecks,
  matrix: Grid3x3,
  dataTable: Table,
  counter: Tally5,
  flowchart: GitBranch,
  mapPins: MapPin,
  prepCard: ClipboardList,
};

type WidgetRailProps = {
  widgets: Widget[];
  emptyLabel: string;
  header?: ReactNode;
  onOpen: (widgetId: string) => void;
};

// Browse posture (S3): the side rails are launchers only — one button per
// widget in deck order; the widget body renders full-size in WidgetDialog.
export function WidgetRail({
  widgets,
  emptyLabel,
  header,
  onOpen,
}: WidgetRailProps) {
  return (
    <div className="space-y-2">
      {header}
      {widgets.length === 0 ? (
        <p className="text-xs text-ink-soft">{emptyLabel}</p>
      ) : (
        widgets.map((widget) => {
          const Icon = typeIcons[widget.type];
          return (
            <Button
              key={widget.id}
              variant="outline"
              size="sm"
              className="w-full justify-start"
              title={widget.title}
              onClick={() => onOpen(widget.id)}
            >
              <Icon />
              <span className="truncate">{widget.title}</span>
            </Button>
          );
        })
      )}
    </div>
  );
}
