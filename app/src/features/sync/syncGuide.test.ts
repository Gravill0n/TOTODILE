import { describe, expect, it, vi } from "vitest";
import { type SyncDeps, syncGuide } from "@/features/sync/syncGuide";
import { raMapping } from "@/schema";

const credentials = { username: "Pierre", webApiKey: "KEY" };

const mapping = raMapping.parse({
  schemaVersion: 1,
  guideId: "fictional-quest",
  raGameId: 9000,
  entries: [
    {
      raAchievementId: 101,
      targetItemId: "fictional-quest:c1:s1",
      sourceRefs: ["src-wiki"],
      confidence: "normal",
    },
  ],
});

function deps(over: Partial<SyncDeps> = {}): SyncDeps {
  return {
    fetchUnlocks: vi.fn(async () => ({
      status: "ok" as const,
      unlocked: [101],
    })),
    loadMapping: vi.fn(async () => mapping),
    ...over,
  };
}

const args = {
  slug: "fictional-quest",
  raGameId: 9000,
  credentials,
  doneIds: new Set<string>(),
};

describe("syncGuide (FR-C, §12.2 fake client)", () => {
  it("backfills: every earned mapped item becomes newly marked", async () => {
    const outcome = await syncGuide(args, deps());
    expect(outcome).toEqual({
      status: "ok",
      receipt: { newlyMarked: 1, alreadyDone: 0, unmapped: 0 },
      toMark: ["fictional-quest:c1:s1"],
    });
  });

  it("propagates a mid-sync client error and writes nothing (atomic)", async () => {
    const outcome = await syncGuide(
      args,
      deps({
        fetchUnlocks: vi.fn(async () => ({
          status: "error" as const,
          reason: "auth" as const,
        })),
      }),
    );
    expect(outcome).toEqual({ status: "error", reason: "auth" });
    expect("toMark" in outcome).toBe(false);
  });

  it("never touches the network without credentials", async () => {
    const d = deps();
    const outcome = await syncGuide({ ...args, credentials: null }, d);
    expect(outcome).toEqual({ status: "error", reason: "noCredentials" });
    expect(d.fetchUnlocks).not.toHaveBeenCalled();
  });
});
