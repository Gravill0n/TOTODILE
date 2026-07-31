import { describe, expect, it } from "vitest";
import { CLUSTER_RADIUS, clusterLabel, clusterPins } from "./pinClusters";

const pin = (itemId: string, x: number, y: number) => ({
  itemId,
  label: itemId,
  x,
  y,
});

const idsOf = (clusters: ReturnType<typeof clusterPins>) =>
  clusters.map((cluster) => cluster.pins.map((p) => p.itemId));

describe("clusterPins", () => {
  // The bug this exists for: 181 Crystal pins share a coordinate with another
  // pin, and the buried ones were unreachable behind the top marker.
  it("groups pins on the very same spot", () => {
    expect(
      idsOf(clusterPins([pin("a", 0.5, 0.5), pin("b", 0.5, 0.5)])),
    ).toEqual([["a", "b"]]);
  });

  it("groups pins closer than the radius, keeps the rest apart", () => {
    const clusters = clusterPins([
      pin("a", 0.5, 0.5),
      pin("near", 0.5 + CLUSTER_RADIUS / 2, 0.5),
      pin("far", 0.9, 0.9),
    ]);
    expect(idsOf(clusters)).toEqual([["a", "near"], ["far"]]);
  });

  it("keeps pins exactly beyond the radius apart", () => {
    const clusters = clusterPins([
      pin("a", 0.5, 0.5),
      pin("b", 0.5 + CLUSTER_RADIUS * 1.01, 0.5),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("leaves a lone pin exactly where it was authored", () => {
    const clusters = clusterPins([pin("only", 0.25, 0.75)]);
    expect(clusters).toEqual([
      { x: 0.25, y: 0.75, pins: [pin("only", 0.25, 0.75)] },
    ]);
  });

  // A pair either side of a doorway should mark the doorway, not one jamb.
  it("puts the marker at the mean of its members", () => {
    const [cluster] = clusterPins([pin("a", 0.5, 0.5), pin("b", 0.51, 0.52)]);
    expect(cluster?.x).toBeCloseTo(0.505);
    expect(cluster?.y).toBeCloseTo(0.51);
  });

  it("keeps authored order, so the map and the numbered legend agree", () => {
    const clusters = clusterPins([
      pin("first", 0.1, 0.1),
      pin("second", 0.9, 0.9),
      pin("third", 0.1, 0.1),
    ]);
    expect(idsOf(clusters)).toEqual([["first", "third"], ["second"]]);
  });

  it("has nothing to do with an empty pin list", () => {
    expect(clusterPins([])).toEqual([]);
  });
});

describe("clusterLabel", () => {
  const legendNumberOf = (itemId: string) => (itemId === "a" ? 1 : 7);

  it("shows a lone pin's legend number, so map and list read as one", () => {
    const [cluster] = clusterPins([pin("a", 0.1, 0.1)]);
    expect(cluster && clusterLabel(cluster, legendNumberOf)).toBe("1");
  });

  it("shows how many a group holds", () => {
    const [cluster] = clusterPins([
      pin("a", 0.1, 0.1),
      pin("b", 0.1, 0.1),
      pin("c", 0.1, 0.1),
    ]);
    expect(cluster && clusterLabel(cluster, legendNumberOf)).toBe("3");
  });
});
