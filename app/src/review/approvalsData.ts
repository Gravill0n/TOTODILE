import type { ApprovalsFile, LayersManifest } from "../schema";
import { approvalsFile } from "../schema";
import { loadLayersManifest, qaReportExists } from "./reviewLoaders";

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

// FR-E5 — a guide is playable only when every one of its layers is approved
// AND the pipeline is complete. Per-stage review exports partial approvals
// files (e.g. spine-only, all approved) mid-pipeline; without the qaComplete
// and manifest-coverage checks such a guide would go playable after stage 1.
// A null manifest is the legacy pre-manifest state — the old all-approved
// rule applies, still gated on QA having run.
export function isPlayable(
  approvals: ApprovalsFile | null,
  manifest: LayersManifest | null,
  qaComplete: boolean,
): boolean {
  if (!qaComplete) return false;
  if (approvals === null || approvals.layers.length === 0) return false;
  if (!approvals.layers.every((layer) => layer.status === "approved")) {
    return false;
  }
  if (manifest === null) return true;
  // Every compiled reviewable layer has cleared review — a widget compiled
  // after the last export has a manifest entry but no record, and blocks.
  // (Orphan records with no manifest entry are tolerated; the next export
  // drops them.)
  const approvedIds = new Set(approvals.layers.map((layer) => layer.id));
  return manifest.entries.every((entry) => approvedIds.has(entry.id));
}

// The three playability inputs live in three files; routes want one answer.
export async function loadPlayability(slug: string): Promise<boolean> {
  const [approvals, manifest, qaComplete] = await Promise.all([
    loadApprovals(slug),
    loadLayersManifest(slug),
    qaReportExists(slug),
  ]);
  return isPlayable(approvals, manifest, qaComplete);
}
