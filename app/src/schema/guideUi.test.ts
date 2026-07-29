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
    // Rail sizes land near the prototype's 248 / 352 px at a ~1440px window.
    expect(record.leftRailPct).toBe(18);
    expect(record.rightRailPct).toBe(25);
    expect(record.mapPanePct).toBe(45);
  });

  // Percentages, not pixels: react-resizable-panels speaks in percent, and a
  // percentage survives a window resize where a pixel width would not.
  it("rejects rail sizes outside the range a usable column can occupy", () => {
    expectRejects(guideUiRecord, { ...validGuideUi(), leftRailPct: 2 });
    expectRejects(guideUiRecord, { ...validGuideUi(), leftRailPct: 60 });
    expectRejects(guideUiRecord, { ...validGuideUi(), rightRailPct: 5 });
    expectRejects(guideUiRecord, { ...validGuideUi(), rightRailPct: 70 });
    expectRejects(guideUiRecord, { ...validGuideUi(), mapPanePct: 5 });
    expectRejects(guideUiRecord, { ...validGuideUi(), mapPanePct: 95 });
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
