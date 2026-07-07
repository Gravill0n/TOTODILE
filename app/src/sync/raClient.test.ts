import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@retroachievements/api", () => ({
  buildAuthorization: vi.fn((options) => options),
  getGameInfoAndUserProgress: vi.fn(),
}));

import {
  buildAuthorization,
  getGameInfoAndUserProgress,
} from "@retroachievements/api";
import { fetchUnlocks } from "@/sync/raClient";

const credentials = { username: "Pierre", webApiKey: "SECRET-KEY-123" };

beforeEach(() => vi.clearAllMocks());

describe("fetchUnlocks (isolated RA client, §22.3)", () => {
  it("returns the earned achievement IDs and leaks no key", async () => {
    vi.mocked(getGameInfoAndUserProgress).mockResolvedValue({
      achievements: {
        1: { id: 1, dateEarned: "2022-08-23 22:56:38", dateEarnedHardcore: "" },
        2: { id: 2, dateEarned: "", dateEarnedHardcore: "" },
        3: { id: 3, dateEarned: "", dateEarnedHardcore: "2022-09-01 10:00" },
      },
    } as never);

    const result = await fetchUnlocks(credentials, 810);

    expect(result).toEqual({ status: "ok", unlocked: [1, 3] });
    expect(buildAuthorization).toHaveBeenCalledWith({
      username: "Pierre",
      webApiKey: "SECRET-KEY-123",
    });
    expect(getGameInfoAndUserProgress).toHaveBeenCalledWith(
      { username: "Pierre", webApiKey: "SECRET-KEY-123" },
      { gameId: 810, username: "Pierre" },
    );
    // §17.4 — the key never travels in the domain result.
    expect(JSON.stringify(result)).not.toContain("SECRET-KEY-123");
  });

  it("maps wire failures to domain reasons, never throwing", async () => {
    const cases: [unknown, string][] = [
      [{ status: 401 }, "auth"],
      [{ status: 403 }, "auth"],
      [{ status: 429 }, "rateLimit"],
      [{ status: 500 }, "network"],
      [new Error("offline"), "network"],
    ];
    for (const [thrown, reason] of cases) {
      vi.mocked(getGameInfoAndUserProgress).mockRejectedValueOnce(thrown);
      const result = await fetchUnlocks(credentials, 810);
      expect(result).toEqual({ status: "error", reason });
    }
  });
});
