import type { RaMapping, SourceManifest } from "../schema";
import { raMapping, sourceManifest } from "../schema";

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
