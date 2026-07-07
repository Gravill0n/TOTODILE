import type { RaCredentials } from "./types";

// The browser settings store for RA credentials (§10.2). localStorage, in its
// own key — deliberately apart from the IndexedDB progress store, so the key
// can never ride along in a progress export (§17.4). The key is never logged.
const KEY = "totodile.ra";

export function getCredentials(): RaCredentials | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RaCredentials>;
    if (
      typeof parsed.username === "string" &&
      typeof parsed.webApiKey === "string" &&
      parsed.username &&
      parsed.webApiKey
    ) {
      return { username: parsed.username, webApiKey: parsed.webApiKey };
    }
    return null;
  } catch {
    return null;
  }
}

// Empty username or key clears the store — there is no "half" credential.
export function setCredentials(credentials: RaCredentials): void {
  const username = credentials.username.trim();
  const webApiKey = credentials.webApiKey.trim();
  try {
    if (!username || !webApiKey) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify({ username, webApiKey }));
  } catch {
    // Storage unavailable (private mode / quota) — sync simply stays
    // unavailable rather than throwing into the UI (§15 risk 8).
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}

export function hasCredentials(): boolean {
  return getCredentials() !== null;
}
