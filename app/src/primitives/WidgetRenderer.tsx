import type { ProgressSlice } from "../progress/progressSlice";
import type { Widget } from "../schema";
import { Checklist } from "./checklist/Checklist";
import { Counter } from "./counter/Counter";
import { DataTable } from "./dataTable/DataTable";
import { Flowchart } from "./flowchart/Flowchart";
import { MapPins } from "./mapPins/MapPins";
import { Matrix } from "./matrix/Matrix";
import { PrepCard } from "./prepCard/PrepCard";

export type WidgetRendererProps = {
  widget: Widget;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
  onAdjustCounter: (itemId: string, delta: number) => void;
  onResetCounter: (itemId: string) => void;
  resolveAsset: (path: string) => string;
};

// The closed dispatch over the 7 primitives (§14.3). TypeScript exhausts
// the union: an 8th type cannot slip in silently.
export function WidgetRenderer({
  widget,
  progress,
  onToggle,
  onAdjustCounter,
  onResetCounter,
  resolveAsset,
}: WidgetRendererProps) {
  switch (widget.type) {
    case "checklist":
      return (
        <Checklist widget={widget} progress={progress} onToggle={onToggle} />
      );
    case "matrix":
      return <Matrix widget={widget} progress={progress} onToggle={onToggle} />;
    case "dataTable":
      return (
        <DataTable widget={widget} progress={progress} onToggle={onToggle} />
      );
    case "counter":
      return (
        <Counter
          widget={widget}
          progress={progress}
          onAdjust={onAdjustCounter}
          onReset={onResetCounter}
        />
      );
    case "flowchart":
      return (
        <Flowchart widget={widget} progress={progress} onToggle={onToggle} />
      );
    case "mapPins":
      return (
        <MapPins
          widget={widget}
          progress={progress}
          onToggle={onToggle}
          resolveAsset={resolveAsset}
        />
      );
    case "prepCard":
      return (
        <PrepCard widget={widget} progress={progress} onToggle={onToggle} />
      );
  }
}
