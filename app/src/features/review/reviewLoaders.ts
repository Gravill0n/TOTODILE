import { fetchOptionalJson } from "@/lib/content/fetchJson";
import type { GenreDeck, LayersManifest, SourceManifest } from "@/schema";
import { genreDeck, layersManifest, sourceManifest } from "@/schema";

// Same content-fetch contract as loadGuide/loadApprovals: a 404 is the
// expected "absent" case (resolved to null); a present-but-malformed file
// throws into the route's visible broken state (§11.1).

export async function loadSources(
  slug: string,
): Promise<SourceManifest | null> {
  return fetchOptionalJson(
    `guides/${slug}/sources.json`,
    sourceManifest,
    `sources for "${slug}"`,
  );
}

// deck.json names the slots the slot-group cards are titled after (§6.4).
// Tolerant 404 → null: the lens falls back to member widget titles.
export async function loadDeck(slug: string): Promise<GenreDeck | null> {
  return fetchOptionalJson(
    `guides/${slug}/deck.json`,
    genreDeck,
    `deck for "${slug}"`,
  );
}

// layers/manifest.json is the reviewable-layer roster, upserted per pass run
// (contract §2 rule 9). Absent until the first spine pass — a legal state.
export async function loadLayersManifest(
  slug: string,
): Promise<LayersManifest | null> {
  return fetchOptionalJson(
    `guides/${slug}/layers/manifest.json`,
    layersManifest,
    `layers manifest for "${slug}"`,
  );
}

// Whether the QA pass has run — the pipeline-completion signal playability
// requires (FR-E5 + per-stage gating). Existence only; the report body is
// the roster's concern, not this check's.
export async function qaReportExists(slug: string): Promise<boolean> {
  const response = await fetch(`guides/${slug}/layers/qa.report.json`);
  return response.ok;
}
