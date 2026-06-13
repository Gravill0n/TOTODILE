import {
  buildAuthorization,
  getGameInfoAndUserProgress,
} from "@retroachievements/api";
import type { GameId, RaCredentials, RaUnlocksResult } from "./types";

// The ONE module that imports @retroachievements/api. Its response types stay
// here; callers receive only the domain RaUnlocksResult (§22.3, §9.1).

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const e = error as {
      status?: unknown;
      statusCode?: unknown;
      cause?: unknown;
    };
    if (typeof e.status === "number") return e.status;
    if (typeof e.statusCode === "number") return e.statusCode;
    if (typeof e.cause === "object" && e.cause !== null) {
      const cause = e.cause as { status?: unknown };
      if (typeof cause.status === "number") return cause.status;
    }
  }
  return undefined;
}

// Map any thrown wire error to a domain reason (§8.1 failure handling). The
// exact RA status codes are pinned here, the one place that knows them.
function classify(error: unknown): "auth" | "rateLimit" | "network" {
  const status = statusOf(error);
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rateLimit";
  return "network";
}

// FR-C2/C4: the user's unlocked achievement IDs for one game. One call =
// everything earned to date, so the first Sync backfills full history. RA is
// read-only and only ever called from an explicit user action (§8.1) — the
// caller (Task 2) passes the credentials it read from settings.
export async function fetchUnlocks(
  credentials: RaCredentials,
  gameId: GameId,
): Promise<RaUnlocksResult> {
  try {
    const authorization = buildAuthorization({
      username: credentials.username,
      webApiKey: credentials.webApiKey,
    });
    const progress = await getGameInfoAndUserProgress(authorization, {
      gameId,
      username: credentials.username,
    });
    const unlocked = Object.values(progress.achievements)
      .filter((a) => Boolean(a.dateEarned) || Boolean(a.dateEarnedHardcore))
      .map((a) => a.id);
    return { status: "ok", unlocked };
  } catch (error) {
    // Never surface the key or the wire error — only a domain reason.
    return { status: "error", reason: classify(error) };
  }
}
