import type { ProgressSlice } from "../../progress/progressSlice";
import type { FlowchartWidget } from "../../schema";
import { FlagMark } from "../FlagMark";

type FlowchartProps = {
  widget: FlowchartWidget;
  progress: ProgressSlice;
  onToggle: (itemId: string) => void;
};

// §9.3 degraded list — nodes in authored order; the edges only express
// sequence visually (↓) until the real chain renderer arrives in Phase 5.
export function Flowchart({ widget, progress, onToggle }: FlowchartProps) {
  return (
    <ol className="space-y-1 text-sm">
      {widget.nodes.map((node, index) => {
        const done = progress.doneIds.has(node.itemId);
        return (
          <li key={node.itemId} className="flex items-start gap-2">
            <span className="w-4 shrink-0 text-xs text-ink-soft">
              {index === 0 ? "" : "↓"}
            </span>
            <input
              type="checkbox"
              checked={done}
              onChange={() => onToggle(node.itemId)}
              aria-label={node.label}
              className="mt-0.5 size-4 shrink-0 accent-accent"
            />
            <span className={done ? "line-through opacity-60" : ""}>
              {node.label}
              {node.confidence === "flagged" ? (
                <>
                  {" "}
                  <FlagMark />
                </>
              ) : null}
              {node.note ? (
                <span className="block text-xs text-ink-soft">{node.note}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
