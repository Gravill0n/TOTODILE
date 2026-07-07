// The ONLY types that escape sync/ (§22.3): the rest of the app never sees a
// RetroAchievements wire type or the @retroachievements/api library. RA is the
// most likely external thing to change (§9.2 risk 3), so it stays sealed here.

export type GameId = number;
export type AchievementId = number;

// Entered once in Settings, held only in browser storage (§17.4) — never in the
// repo, guide data, logs, exports, or fixtures.
export type RaCredentials = {
  username: string;
  webApiKey: string;
};

// Expected failures are returned as values, never thrown (§22.4). The reason is
// a domain enum the UI maps to a §11 message — the wire status never leaks.
export type RaUnlocksResult =
  | { status: "ok"; unlocked: AchievementId[] }
  | { status: "error"; reason: "auth" | "rateLimit" | "network" };
