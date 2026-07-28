import { describe, expect, it } from "vitest";
import { guideUiRecord } from "@/schema";
import { expectParses, expectRejects, validGuideUi } from "@/testing/helpers";

describe("guideUiRecord", () => {
  it("parses a populated record", () => {
    expectParses(guideUiRecord, validGuideUi());
  });

  it("defaults every preference so a first read needs no seeding", () => {
    const record = guideUiRecord.parse({ guideId: "fictional-quest" });
    expect(record.widgetOrder).toEqual([]);
    expect(record.pinnedWidgetIds).toEqual([]);
    expect(record.mapZoom).toBe(1);
    expect(record.mapPanX).toBe(0);
    expect(record.mapPanY).toBe(0);
  });

  it("rejects a zoom outside the 100%–400% range the map panel offers", () => {
    expectRejects(guideUiRecord, { ...validGuideUi(), mapZoom: 0.5 });
    expectRejects(guideUiRecord, { ...validGuideUi(), mapZoom: 4.2 });
  });

  // The pan is stored as a fraction of the scrollable extent, not as pixels:
  // the map panel is ~320px on desktop and full-width on the phone, so pixels
  // would land somewhere else on the other posture.
  it("rejects a pan outside the 0–1 fraction of the scrollable extent", () => {
    expectRejects(guideUiRecord, { ...validGuideUi(), mapPanX: -0.1 });
    expectRejects(guideUiRecord, { ...validGuideUi(), mapPanY: 1.5 });
  });

  it("rejects ids that are not widget ids", () => {
    expectRejects(guideUiRecord, {
      ...validGuideUi(),
      widgetOrder: ["fictional-quest:counters:blue-coins"],
    });
  });
});
