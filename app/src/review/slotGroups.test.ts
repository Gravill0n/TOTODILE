import { describe, expect, it } from "vitest";
import type { LayerReport } from "@/review/layerRoster";
import { buildSlotGroups, scopeLabel } from "@/review/slotGroups";
import type { GuideFile, WidgetScope } from "@/schema";
import { genreDeck, guideFile } from "@/schema";
import { validDeck, validGuide } from "@/testing/helpers";

function widgetLayerReport(
  id: string,
  deckPosition: number,
  scope: WidgetScope = { kind: "global" },
  title = "Widget",
): LayerReport {
  return {
    id,
    kind: "widget",
    rowCount: 1,
    anomalies: [],
    flaggedItemIds: [],
    contentHash: `sha256:${"a".repeat(64)}`,
    widget: { deckPosition, scope, title },
  };
}

describe("buildSlotGroups", () => {
  it("buckets widget layers by deck slot, ordered by deckPosition", () => {
    const groups = buildSlotGroups(
      [
        widgetLayerReport("widget-enc-azalea", 2),
        widgetLayerReport("widget-badges", 0),
        widgetLayerReport("widget-enc-blackthorn", 2),
      ],
      null,
    );
    expect(groups.map((g) => g.deckPosition)).toEqual([0, 2]);
    expect(groups[1]?.layers.map((l) => l.id)).toEqual([
      "widget-enc-azalea",
      "widget-enc-blackthorn",
    ]);
  });

  it("titles a group from the deck slot, falling back to the first member", () => {
    const deck = genreDeck.parse(validDeck());
    const groups = buildSlotGroups(
      [
        widgetLayerReport("widget-treasure", 0, { kind: "global" }, "Keys"),
        widgetLayerReport("widget-mystery", 99, { kind: "global" }, "Mystery"),
      ],
      deck,
    );
    expect(groups[0]?.title).toBe("Key items"); // deck slot 0 defaultTitle
    expect(groups[1]?.title).toBe("Mystery"); // slot 99 not in deck
  });

  it("keeps a metadata-less layer as its own singleton group, never dropped", () => {
    const bare: LayerReport = {
      id: "widget-orphan",
      kind: "widget",
      rowCount: 1,
      anomalies: [],
      flaggedItemIds: [],
      contentHash: `sha256:${"a".repeat(64)}`,
    };
    const groups = buildSlotGroups(
      [bare, widgetLayerReport("widget-badges", 0)],
      null,
    );
    expect(groups).toHaveLength(2);
    const orphan = groups.find((g) => g.layers[0]?.id === "widget-orphan");
    expect(orphan?.deckPosition).toBeNull();
    expect(orphan?.title).toBe("widget-orphan");
  });

  it("gives every group a stable unique key", () => {
    const groups = buildSlotGroups(
      [widgetLayerReport("widget-a", 0), widgetLayerReport("widget-b", 1)],
      null,
    );
    expect(new Set(groups.map((g) => g.key)).size).toBe(2);
  });
});

describe("scopeLabel", () => {
  const guide: GuideFile = guideFile.parse(validGuide());

  it("resolves chapter and location scopes to their display names", () => {
    expect(
      scopeLabel({ kind: "chapter", chapterId: "fictional-quest:c1" }, guide),
    ).toBe("Chapter 1 — The Castle Gate");
    expect(
      scopeLabel(
        { kind: "location", locationId: "fictional-quest:castle-gate" },
        guide,
      ),
    ).toBe("Castle Gate");
  });

  it("falls back to the raw ID segment when the guide cannot resolve it", () => {
    expect(
      scopeLabel(
        { kind: "location", locationId: "fictional-quest:nowhere" },
        null,
      ),
    ).toBe("nowhere");
    expect(
      scopeLabel({ kind: "visit", visitId: "fictional-quest:v1" }, guide),
    ).toBe("v1");
  });

  it("labels a global scope plainly", () => {
    expect(scopeLabel({ kind: "global" }, guide)).toBe("global");
  });
});
