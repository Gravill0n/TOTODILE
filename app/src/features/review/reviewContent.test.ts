// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LayerReport } from "@/features/review/layerRoster";
import { loadReviewGuide } from "@/features/review/reviewContent";
import { loadRaMapping } from "@/lib/content/raMapping";
import {
  validGuide,
  validRaMapping,
  validSpineLayer,
  validWidgetLayer,
} from "@/testing/helpers";

afterEach(() => vi.unstubAllGlobals());

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

// Serves guide.json when given; otherwise 404s it and serves the layers.
function stubFetch({
  guide,
  spine,
  widgets = {},
}: {
  guide?: unknown;
  spine?: unknown;
  widgets?: Record<string, unknown>;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("guides/fictional-quest/guide.json")) {
        return guide
          ? Response.json(guide)
          : new Response("not found", { status: 404 });
      }
      if (url.endsWith("layers/spine.json")) {
        return spine
          ? Response.json(spine)
          : new Response("not found", { status: 404 });
      }
      const widget = url.match(/layers\/(widget-[a-z0-9-]+)\.json$/)?.[1];
      if (widget && widgets[widget]) return Response.json(widgets[widget]);
      return new Response("not found", { status: 404 });
    }),
  );
}

describe("loadReviewGuide", () => {
  it("passes an assembled guide.json through untouched", async () => {
    stubFetch({ guide: validGuide() });
    const guide = await loadReviewGuide("fictional-quest", [
      layer("spine", "spine"),
    ]);
    expect(guide?.guideId).toBe("fictional-quest");
    expect(guide?.widgets).toHaveLength(7);
  });

  it("assembles from spine + roster widget layers when guide.json is absent", async () => {
    stubFetch({
      spine: validSpineLayer(),
      widgets: {
        "widget-w2": validWidgetLayer(2),
        "widget-w1": validWidgetLayer(1),
      },
    });
    const guide = await loadReviewGuide("fictional-quest", [
      layer("spine", "spine"),
      // Roster order is alphabetical; assembly must sort by deckPosition.
      layer("widget-w2", "widget"),
      layer("widget-w1", "widget"),
    ]);
    expect(guide?.guideId).toBe("fictional-quest");
    expect(guide?.chapters).toHaveLength(1);
    expect(guide?.widgets.map((w) => w.deckPosition)).toEqual([0, 1]);
  });

  it("spine-stage pipeline (no widgets yet) yields a widgetless guide", async () => {
    stubFetch({ spine: validSpineLayer() });
    const guide = await loadReviewGuide("fictional-quest", [
      layer("spine", "spine"),
    ]);
    expect(guide?.chapters).toHaveLength(1);
    expect(guide?.widgets).toEqual([]);
  });

  it("returns null when neither guide.json nor a spine layer exists", async () => {
    stubFetch({});
    expect(await loadReviewGuide("fictional-quest", [])).toBeNull();
  });

  it("throws when a roster widget artifact is missing (a real fault)", async () => {
    stubFetch({ spine: validSpineLayer() });
    await expect(
      loadReviewGuide("fictional-quest", [
        layer("spine", "spine"),
        layer("widget-ghost", "widget"),
      ]),
    ).rejects.toThrow(/widget-ghost/);
  });
});

describe("loadRaMapping — layers/ fallback (mid-pipeline)", () => {
  it("falls back to layers/ra-mapping.json before assembly copies it up", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("guides/fictional-quest/ra-mapping.json")) {
          return new Response("not found", { status: 404 });
        }
        if (url.endsWith("guides/fictional-quest/layers/ra-mapping.json")) {
          return Response.json(validRaMapping());
        }
        return new Response("not found", { status: 404 });
      }),
    );
    const mapping = await loadRaMapping("fictional-quest");
    expect(mapping?.entries).toHaveLength(2);
  });

  it("still resolves null when neither location has the file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    expect(await loadRaMapping("fictional-quest")).toBeNull();
  });
});
