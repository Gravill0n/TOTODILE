import { describe, expect, it } from "vitest";
import type { ImageRefLike } from "./migrateMapImagesCore.ts";
import {
  locationMaps,
  MIGRATION_NOTE,
  migrateLocations,
  refreshReportInputs,
} from "./migrateMapImagesCore.ts";

const gate = { src: "images/gate.png", alt: "Gate" };
const b1 = { src: "images/b1.png", alt: "B1F" };
const b2 = { src: "images/b2.png", alt: "B2F" };

const pinWidget = (
  locationId: string,
  image: { src: string; alt: string },
) => ({
  type: "mapPins",
  image,
  scope: { kind: "location", locationId },
});

describe("locationMaps", () => {
  const here = { id: "g:ice-path", name: "Ice Path", mapImage: gate };

  it("keeps the location's own map first", () => {
    const maps = locationMaps(here, [pinWidget("g:ice-path", b1)]);
    expect(maps.map((m) => m.src)).toEqual([
      "images/gate.png",
      "images/b1.png",
    ]);
  });

  it("adopts every distinct pin-widget map for the place, in widget order", () => {
    const maps = locationMaps(here, [
      pinWidget("g:ice-path", b2),
      pinWidget("g:ice-path", b1),
    ]);
    expect(maps.map((m) => m.src)).toEqual([
      "images/gate.png",
      "images/b2.png",
      "images/b1.png",
    ]);
  });

  it("never duplicates the map a pin widget shares with its location", () => {
    expect(locationMaps(here, [pinWidget("g:ice-path", gate)])).toHaveLength(1);
  });

  it("ignores widgets scoped elsewhere, and non-map widgets", () => {
    const maps = locationMaps(here, [
      pinWidget("g:other-place", b1),
      {
        type: "checklist",
        scope: { kind: "location", locationId: "g:ice-path" },
      },
      { type: "mapPins", image: b2, scope: { kind: "global" } },
    ]);
    expect(maps.map((m) => m.src)).toEqual(["images/gate.png"]);
  });

  it("gives a place with no map at all an empty list, not a phantom entry", () => {
    expect(locationMaps({ id: "g:void", name: "Void" }, [])).toEqual([]);
  });
});

describe("migrateLocations", () => {
  const guideBody = (): {
    locations: {
      id: string;
      name: string;
      mapImage?: ImageRefLike;
      mapImages?: ImageRefLike[];
    }[];
    widgets: ReturnType<typeof pinWidget>[];
  } => ({
    locations: [
      { id: "g:ice-path", name: "Ice Path", mapImage: gate },
      { id: "g:void", name: "Void" },
    ],
    widgets: [pinWidget("g:ice-path", b1), pinWidget("g:ice-path", b2)],
  });

  it("replaces mapImage with mapImages everywhere", () => {
    const body = guideBody();
    migrateLocations(body);
    expect(body.locations[0]).not.toHaveProperty("mapImage");
    expect(body.locations[0]?.mapImages?.map((m) => m.src)).toEqual([
      "images/gate.png",
      "images/b1.png",
      "images/b2.png",
    ]);
    expect(body.locations[1]?.mapImages).toEqual([]);
  });

  it("counts what it did, so the run can be reported rather than trusted", () => {
    expect(migrateLocations(guideBody())).toEqual({
      locations: 2,
      shapeConverted: 1,
      adopted: 2,
      multiMap: 1,
    });
  });

  // The spine layer holds no widgets: it converts shape only, and picks up the
  // adopted maps when guide.json is migrated beside it.
  it("is shape-only when there are no widgets to adopt from", () => {
    const spine: {
      locations: {
        id: string;
        name: string;
        mapImage?: ImageRefLike;
        mapImages?: ImageRefLike[];
      }[];
    } = {
      locations: [{ id: "g:ice-path", name: "Ice Path", mapImage: gate }],
    };
    expect(migrateLocations(spine)).toMatchObject({ adopted: 0, multiMap: 0 });
    expect(spine.locations[0]?.mapImages).toEqual([gate]);
  });

  it("is idempotent — a second run changes nothing", () => {
    const body = guideBody();
    migrateLocations(body);
    const after = structuredClone(body);
    migrateLocations(body);
    expect(body).toEqual(after);
  });
});

describe("refreshReportInputs", () => {
  const report = () => ({
    inputs: [
      { file: "layers/spine.json", sha256: "old-spine" },
      { file: "layers/data.json", sha256: "old-data" },
      { file: "sources.json", sha256: "old-sources" },
    ],
    notes: ["something the pass said"],
  });
  const digests: Record<string, string> = {
    "layers/spine.json": "new-spine",
    "layers/data.json": "new-data",
    "sources.json": "new-sources",
  };
  const digestOf = (file: string) => digests[file] ?? null;

  it("refreshes only the two files the migration rewrote", () => {
    const body = report();
    expect(refreshReportInputs(body, digestOf)).toBe(true);
    expect(body.inputs.map((i) => i.sha256)).toEqual([
      "new-spine",
      // Untouched: a genuinely stale data layer must still be caught.
      "old-data",
      "old-sources",
    ]);
  });

  it("records why, beside whatever the pass already noted", () => {
    const body = report();
    refreshReportInputs(body, digestOf);
    expect(body.notes).toEqual(["something the pass said", MIGRATION_NOTE]);
  });

  it("reports no change when the digests already match", () => {
    const body = {
      inputs: [{ file: "layers/spine.json", sha256: "new-spine" }],
      notes: [],
    };
    expect(refreshReportInputs(body, digestOf)).toBe(false);
    expect(body.notes).toEqual([]);
  });

  it("leaves a report that never read those files alone", () => {
    const body = { inputs: [{ file: "sources.json", sha256: "old" }] };
    expect(refreshReportInputs(body, digestOf)).toBe(false);
  });
});

describe("refreshReportInputs — a caller's own note", () => {
  it("records the reason it was given, not the migration's", () => {
    const body = {
      inputs: [{ file: "layers/spine.json", sha256: "old" }],
      notes: [],
    };
    refreshReportInputs(body, () => "new", "Spine re-run: maps only.");
    expect(body.notes).toEqual(["Spine re-run: maps only."]);
  });
});
