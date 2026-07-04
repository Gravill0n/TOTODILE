import type { LayersManifest, RaMapping, SourceManifest } from "../schema";
import { layersManifest, raMapping, sourceManifest } from "../schema";

// Same content-fetch contract as loadGuide/loadApprovals: a 404 is the
// expected "absent" case (resolved to null); a present-but-malformed file
// throws into the route's visible broken state (§11.1).

export async function loadSources(
  slug: string,
): Promise<SourceManifest | null> {
  const response = await fetch(`guides/${slug}/sources.json`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Could not load sources for "${slug}" (HTTP ${response.status})`,
    );
  }
  return sourceManifest.parse(await response.json());
}

// layers/manifest.json is the reviewable-layer roster, upserted per pass run
// (contract §2 rule 9). Absent until the first spine pass — a legal state.
export async function loadLayersManifest(
  slug: string,
): Promise<LayersManifest | null> {
  const response = await fetch(`guides/${slug}/layers/manifest.json`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Could not load layers manifest for "${slug}" (HTTP ${response.status})`,
    );
  }
  return layersManifest.parse(await response.json());
}

// Whether the QA pass has run — the pipeline-completion signal playability
// requires (FR-E5 + per-stage gating). Existence only; the report body is
// the roster's concern, not this check's.
export async function qaReportExists(slug: string): Promise<boolean> {
  const response = await fetch(`guides/${slug}/layers/qa.report.json`);
  return response.ok;
}

// ra-mapping.json is optional — a guide with no RA set has none (§6.5).
export async function loadRaMapping(slug: string): Promise<RaMapping | null> {
  const response = await fetch(`guides/${slug}/ra-mapping.json`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Could not load RA mapping for "${slug}" (HTTP ${response.status})`,
    );
  }
  return raMapping.parse(await response.json());
}
