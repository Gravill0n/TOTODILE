import { describe, it } from "vitest";
import { dataLayer, passReportFile, spineLayer, widgetLayer } from "@/schema";
import {
  expectParses,
  expectRejects,
  validDataLayer,
  validPassReport,
  validSpineLayer,
  validWidgetLayer,
} from "@/testing/helpers";

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

describe("dataLayer (extract-data pass)", () => {
  it("parses a valid data layer", () => {
    expectParses(dataLayer, validDataLayer());
  });

  it("rejects the wrong pass discriminant", () => {
    expectRejects(dataLayer, { ...validDataLayer(), pass: "spine" });
  });

  it("rejects an empty datasets list", () => {
    expectRejects(dataLayer, { ...validDataLayer(), datasets: [] });
  });

  it("rejects a dataset with no records", () => {
    const layer = validDataLayer();
    const dataset = layer.datasets[0];
    if (dataset) dataset.records = [];
    expectRejects(dataLayer, layer);
  });

  it("rejects a record with no source references (§6.6 invariant)", () => {
    const layer = validDataLayer();
    const record = layer.datasets[0]?.records[0];
    if (record) record.sourceRefs = [];
    expectRejects(dataLayer, layer);
  });

  it("rejects duplicate dataset IDs", () => {
    const layer = validDataLayer();
    const first = layer.datasets[0];
    if (first) layer.datasets = [first, { ...first }] as never;
    expectRejects(dataLayer, layer);
  });

  it("rejects duplicate record IDs within a dataset", () => {
    const layer = validDataLayer();
    const dataset = layer.datasets[0];
    const record = dataset?.records[0];
    if (dataset && record) dataset.records = [record, { ...record }] as never;
    expectRejects(dataLayer, layer);
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
    // extract-data emits the "data" layer (pass id ≠ layer base).
    expectParses(passReportFile, validPassReport("data", "extract-data"));
  });

  it("rejects a layer that does not belong to the pass", () => {
    expectRejects(passReportFile, validPassReport("spine", "widget"));
    expectRejects(passReportFile, validPassReport("widget-w1", "spine"));
    expectRejects(passReportFile, validPassReport("qa", "spine"));
    // extract-data's layer base must be "data", not "extract-data".
    expectRejects(
      passReportFile,
      validPassReport("extract-data", "extract-data"),
    );
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
