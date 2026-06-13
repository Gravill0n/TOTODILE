// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isPlayable, loadApprovals } from "../../src/review/approvalsData";
import { approvalsFile, SCHEMA_VERSION } from "../../src/schema";
import { validLayer } from "../schema/helpers";

afterEach(() => vi.unstubAllGlobals());

function approvals(...statuses: ("draft" | "approved" | "rejected")[]) {
  return approvalsFile.parse({
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    layers: statuses.map((status, index) => ({
      ...validLayer(status),
      id: `layer-${index}`,
    })),
  });
}

describe("isPlayable (FR-E5)", () => {
  it("no approvals record → not playable", () => {
    expect(isPlayable(null)).toBe(false);
  });

  it("empty layer set → not playable", () => {
    expect(isPlayable(approvals())).toBe(false);
  });

  it("every layer approved → playable", () => {
    expect(isPlayable(approvals("approved", "approved"))).toBe(true);
  });

  it("any unapproved layer → not playable", () => {
    expect(isPlayable(approvals("approved", "draft"))).toBe(false);
    expect(isPlayable(approvals("approved", "rejected"))).toBe(false);
  });
});

describe("loadApprovals", () => {
  it("returns null when the file is absent (404)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    expect(await loadApprovals("ghost-quest")).toBeNull();
  });

  it("parses a present approvals file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(approvals("approved"))),
    );
    const result = await loadApprovals("fictional-quest");
    expect(result?.layers).toHaveLength(1);
  });

  it("throws on a present-but-malformed file (§11.1)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ schemaVersion: 0, guides: "nope" })),
    );
    await expect(loadApprovals("fictional-quest")).rejects.toThrow();
  });
});
