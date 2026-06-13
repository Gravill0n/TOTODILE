import type { ApprovalsFile } from "../schema";
import { approvalsFile } from "../schema";

// Same content-fetch contract as loadGuide/loadLibrary: relative URLs served by
// the vite middleware in dev/preview and beside dist/ in production (§21.3).
// A guide with no approvals.json simply has nothing approved yet — that is the
// common case until the review-lens flow writes the file (§23.4), so an absent
// file resolves to null rather than throwing. A *malformed* file is a real
// fault and throws into the route's visible broken state (§11.1).
export async function loadApprovals(
  slug: string,
): Promise<ApprovalsFile | null> {
  const response = await fetch(`guides/${slug}/approvals.json`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Could not load approvals for "${slug}" (HTTP ${response.status})`,
    );
  }
  return approvalsFile.parse(await response.json());
}

// FR-E5 — a guide is playable only when every one of its layers is approved.
// No approvals record (or an empty one) means nothing has cleared review yet.
export function isPlayable(approvals: ApprovalsFile | null): boolean {
  if (approvals === null || approvals.layers.length === 0) return false;
  return approvals.layers.every((layer) => layer.status === "approved");
}
