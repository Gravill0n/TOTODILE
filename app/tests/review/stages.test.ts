import { describe, expect, it } from "vitest";
import type { LayerReport } from "../../src/review/layerRoster";
import {
  firstIncompleteStage,
  STAGE_ORDER,
  stageOf,
  stageStates,
} from "../../src/review/stages";

function layer(id: string, kind: LayerReport["kind"]): LayerReport {
  return {
    id,
    kind,
    rowCount: 1,
    anomalies: [],
    flaggedItemIds: [],
    contentHash: `sha256:${"a".repeat(64)}`,
  };
}

const fullRoster = [
  layer("spine", "spine"),
  layer("widget-a", "widget"),
  layer("widget-b", "widget"),
  layer("ra-mapping", "ra-mapping"),
];

describe("stageOf", () => {
  it("maps roster kinds onto the three review stages", () => {
    expect(stageOf("spine")).toBe("spine");
    expect(stageOf("widget")).toBe("widgets");
    expect(stageOf("ra-mapping")).toBe("ra-mapping");
  });
});

describe("stageStates", () => {
  it("marks stages with no compiled layers as empty (spine-only pipeline)", () => {
    const states = stageStates([layer("spine", "spine")], () => "draft");
    expect(states.spine).toBe("in-review");
    expect(states.widgets).toBe("empty");
    expect(states["ra-mapping"]).toBe("empty");
  });

  it("a stage is approved only when every one of its layers is approved", () => {
    const states = stageStates(fullRoster, (id) =>
      id === "widget-b" ? "draft" : "approved",
    );
    expect(states.spine).toBe("approved");
    expect(states.widgets).toBe("in-review");
  });

  it("any rejected layer folds its stage to rejected", () => {
    const states = stageStates(fullRoster, (id) =>
      id === "widget-b" ? "rejected" : "approved",
    );
    expect(states.widgets).toBe("rejected");
  });
});

describe("firstIncompleteStage", () => {
  it("names the earliest stage still carrying undecided or rejected layers", () => {
    const states = stageStates(fullRoster, (id) =>
      id === "spine" ? "approved" : "draft",
    );
    expect(firstIncompleteStage(states)).toBe("widgets");
  });

  it("is null when every compiled stage is approved (empty stages do not block)", () => {
    const states = stageStates([layer("spine", "spine")], () => "approved");
    expect(firstIncompleteStage(states)).toBeNull();
  });

  it("walks the pipeline order", () => {
    expect(STAGE_ORDER).toEqual(["spine", "widgets", "ra-mapping"]);
  });
});
