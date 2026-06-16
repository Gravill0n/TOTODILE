import { describe, it } from "vitest";
import { passReportFile, spineLayer, widgetLayer } from "../../src/schema";
import {
  expectParses,
  expectRejects,
  validPassReport,
  validSpineLayer,
  validWidgetLayer,
} from "./helpers";

describe("spineLayer", () => {
  it("parses a valid spine artifact", () => {
    expectParses(spineLayer, validSpineLayer());
  });

  it("rejects the wrong pass discriminant", () => {
    expectRejects(spineLayer, { ...validSpineLayer(), pass: "widget" });
  });

  it("rejects an empty chapter list", () => {
    expectRejects(spineLayer, { ...validSpineLayer(), chapters: [] });
  });

  it("rejects duplicate step IDs across visits", () => {
    const layer = validSpineLayer();
    const visit = layer.chapters[0]?.visits[0];
    if (visit) visit.steps[1] = { ...visit.steps[0] } as never;
    expectRejects(spineLayer, layer);
  });

  it("rejects a visit referencing an unknown location", () => {
    const layer = validSpineLayer();
    const visit = layer.chapters[0]?.visits[0];
    if (visit) visit.locationId = "fictional-quest:nowhere";
    expectRejects(spineLayer, layer);
  });

  it("rejects chapter IDs that do not carry the guide slug", () => {
    const layer = validSpineLayer();
    if (layer.chapters[0]) layer.chapters[0].id = "other-game:c1";
    expectRejects(spineLayer, layer);
  });
});

describe("widgetLayer", () => {
  it("parses a valid widget artifact", () => {
    expectParses(widgetLayer, validWidgetLayer());
  });

  it("rejects a widget that does not carry the guide slug", () => {
    const layer = validWidgetLayer();
    layer.widget.id = "other-game:w1";
    expectRejects(widgetLayer, layer);
  });

  it("rejects duplicate item IDs", () => {
    const layer = validWidgetLayer();
    layer.widget.rows = [...layer.widget.rows, ...layer.widget.rows] as never;
    expectRejects(widgetLayer, layer);
  });
});

describe("passReportFile", () => {
  it("parses reports for every pass", () => {
    expectParses(passReportFile, validPassReport());
    expectParses(passReportFile, validPassReport("source-gathering"));
    expectParses(passReportFile, validPassReport("qa"));
    expectParses(passReportFile, validPassReport("ra-mapping"));
    expectParses(passReportFile, validPassReport("widget-w1", "widget"));
  });

  it("rejects a layer that does not belong to the pass", () => {
    expectRejects(passReportFile, validPassReport("spine", "widget"));
    expectRejects(passReportFile, validPassReport("widget-w1", "spine"));
    expectRejects(passReportFile, validPassReport("qa", "spine"));
  });

  it("rejects an unknown pass", () => {
    expectRejects(passReportFile, validPassReport("assemble"));
  });

  it("rejects a malformed input digest (contract §5)", () => {
    const report = validPassReport();
    report.inputs = [{ file: "sources.json", sha256: "not-a-digest" }];
    expectRejects(passReportFile, report);
  });

  it("rejects a malformed timestamp", () => {
    expectRejects(passReportFile, {
      ...validPassReport(),
      generatedAt: "yesterday",
    });
  });
});
