import type { ZodType } from "zod";

// The one content-fetch contract (§8.2, §11.1): relative URLs work in dev
// (vite middleware) and beside dist/ in production (§21.3); a malformed file
// throws into the route's visible broken state — never a blank screen.
export async function fetchJson<T>(
  url: string,
  schema: ZodType<T>,
  what: string,
): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${what} (HTTP ${response.status})`);
  }
  return schema.parse(await response.json());
}

// For files whose absence is a legal state (§6.5, FR-E): 404 resolves to
// null; anything else follows the fetchJson contract.
export async function fetchOptionalJson<T>(
  url: string,
  schema: ZodType<T>,
  what: string,
): Promise<T | null> {
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Could not load ${what} (HTTP ${response.status})`);
  }
  return schema.parse(await response.json());
}
