import { describe, it } from "vitest";
import {
  expectParses,
  expectRejects,
  validApprovals,
  validLayer,
} from "@/testing/helpers";
import { approvalsFile, layerRecord } from "../../src/schema";

describe("layerRecord", () => {
  it("parses a draft layer", () => {
    expectParses(layerRecord, validLayer("draft"));
  });

  it("parses an approved layer", () => {
    expectParses(layerRecord, validLayer("approved"));
  });

  it("parses a rejected layer with a note", () => {
    expectParses(layerRecord, validLayer("rejected"));
  });

  it("rejects a draft carrying an approval record", () => {
    expectRejects(layerRecord, {
      ...validLayer("draft"),
      approval: { date: "2026-06-11T10:00:00Z", verdict: "approved" },
    });
  });

  it("rejects an approved layer without an approval record", () => {
    const { approval, ...value } = validLayer("approved");
    expectRejects(layerRecord, value);
  });

  it("rejects an approval verdict contradicting the status", () => {
    expectRejects(layerRecord, {
      ...validLayer("approved"),
      approval: {
        date: "2026-06-11T10:00:00Z",
        verdict: "rejected",
        note: "mismatch",
      },
    });
  });

  it("rejects a rejection without a note (the note feeds the recompile, FR-E4)", () => {
    expectRejects(layerRecord, {
      ...validLayer("rejected"),
      approval: { date: "2026-06-11T10:00:00Z", verdict: "rejected" },
    });
  });

  it("rejects an unknown layer kind", () => {
    expectRejects(layerRecord, { ...validLayer("draft"), kind: "vibes" });
  });

  it("rejects an empty content hash", () => {
    expectRejects(layerRecord, { ...validLayer("draft"), contentHash: "" });
  });
});

describe("approvalsFile", () => {
  it("parses a valid approvals file", () => {
    expectParses(approvalsFile, validApprovals());
  });

  it("parses a file with no layers yet", () => {
    expectParses(approvalsFile, { ...validApprovals(), layers: [] });
  });

  it("rejects duplicate layer IDs", () => {
    const value = validApprovals();
    expectRejects(approvalsFile, {
      ...value,
      layers: [...value.layers, ...value.layers],
    });
  });
});
