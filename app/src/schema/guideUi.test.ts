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
  });

  it("rejects a zoom outside the 100%–400% range the map panel offers", () => {
    expectRejects(guideUiRecord, { ...validGuideUi(), mapZoom: 0.5 });
    expectRejects(guideUiRecord, { ...validGuideUi(), mapZoom: 4.2 });
  });

  it("rejects ids that are not widget ids", () => {
    expectRejects(guideUiRecord, {
      ...validGuideUi(),
      widgetOrder: ["fictional-quest:counters:blue-coins"],
    });
  });
});
