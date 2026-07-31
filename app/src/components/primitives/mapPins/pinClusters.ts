// Pins carry fractional coordinates, and guides put several of them on the
// same spot — Crystal alone has 181 pins sharing a coordinate with another
// pin. Rendered one marker per pin, the later one covers the earlier ones and
// the buried pins cannot be tapped at all: the item under them is unreachable
// from the map.
//
// So pins within a small radius become ONE marker that says how many it holds
// and opens the list. Grouping is a pure function so the rule is testable and
// the two surfaces that draw pins — the widget card and the map panel — group
// identically.

// As a fraction of the image. A marker is 44px (§5.4) on a panel that is
// ~320px wide, so anything closer than this is already covered by the
// neighbouring marker's own circle.
export const CLUSTER_RADIUS = 0.025;

export type PinLike = {
  itemId: string;
  label: string;
  x: number;
  y: number;
};

export type PinCluster<Pin extends PinLike = PinLike> = {
  // The marker's position: the mean of its members, so a pair straddling a
  // doorway marks the doorway rather than one of its two sides.
  x: number;
  y: number;
  pins: Pin[];
};

type Point = { x: number; y: number };

const near = (a: Point, b: Point): boolean =>
  Math.hypot(a.x - b.x, a.y - b.y) <= CLUSTER_RADIUS;

// Greedy, in authored order: a pin joins the first cluster it is near, and
// otherwise starts one. Authored order is what the numbered legend counts in,
// so the clusters come out in that order too — the map and the list agree.
//
// ponytail: O(pins × clusters). The worst real case is Route 42's 34 pins;
// a grid index only matters if a guide ever ships hundreds on one image.
export function clusterPins<Pin extends PinLike>(
  pins: readonly Pin[],
): PinCluster<Pin>[] {
  const clusters: PinCluster<Pin>[] = [];
  for (const pin of pins) {
    const home = clusters.find((cluster) => near(cluster, pin));
    if (home) {
      home.pins.push(pin);
      // Re-centre on the members rather than drifting toward the newest pin.
      home.x = home.pins.reduce((sum, p) => sum + p.x, 0) / home.pins.length;
      home.y = home.pins.reduce((sum, p) => sum + p.y, 0) / home.pins.length;
    } else {
      clusters.push({ x: pin.x, y: pin.y, pins: [pin] });
    }
  }
  return clusters;
}

// What the marker shows: the legend number for a lone pin (so the map and the
// list read as one thing), the count for a group.
export function clusterLabel(
  cluster: PinCluster,
  legendNumberOf: (itemId: string) => number,
): string {
  const first = cluster.pins[0];
  if (!first) return "";
  return cluster.pins.length === 1
    ? String(legendNumberOf(first.itemId))
    : String(cluster.pins.length);
}
