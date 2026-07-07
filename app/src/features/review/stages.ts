import type { LayerRecord } from "@/schema";
import type { LayerReport } from "./layerRoster";

// The three reviewable pipeline stages, in pass order (contract §1): each is
// gated on the previous one's approval before its pass may run. The lens
// only *organizes* by stage — enforcement lives in the skill gates, so a
// backfilled guide still shows everything at once.
export type ReviewStage = "spine" | "widgets" | "ra-mapping";

export const STAGE_ORDER: readonly ReviewStage[] = [
  "spine",
  "widgets",
  "ra-mapping",
];

export const STAGE_LABEL: Record<ReviewStage, string> = {
  spine: "Spine",
  widgets: "Widgets",
  "ra-mapping": "RA mapping",
};

export function stageOf(kind: LayerReport["kind"]): ReviewStage {
  return kind === "widget" ? "widgets" : kind;
}

// empty: the stage's pass has not run yet (waiting placeholder).
// The rest fold the stage's member statuses like a slot group does:
// any rejection wins, full approval next, otherwise still in review.
export type StageState = "empty" | "in-review" | "approved" | "rejected";

export function stageStates(
  roster: LayerReport[],
  statusOf: (layerId: string) => LayerRecord["status"],
): Record<ReviewStage, StageState> {
  const states = {} as Record<ReviewStage, StageState>;
  for (const stage of STAGE_ORDER) {
    const statuses = roster
      .filter((layer) => stageOf(layer.kind) === stage)
      .map((layer) => statusOf(layer.id));
    states[stage] =
      statuses.length === 0
        ? "empty"
        : statuses.some((s) => s === "rejected")
          ? "rejected"
          : statuses.every((s) => s === "approved")
            ? "approved"
            : "in-review";
  }
  return states;
}

// The stage the export helper copy names: the earliest one with work left.
// Null means every compiled stage is approved — export unlocks the next pass.
export function firstIncompleteStage(
  states: Record<ReviewStage, StageState>,
): ReviewStage | null {
  return (
    STAGE_ORDER.find(
      (stage) => states[stage] === "in-review" || states[stage] === "rejected",
    ) ?? null
  );
}
