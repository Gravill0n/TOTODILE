import { fetchJson, fetchOptionalJson } from "@/lib/content/fetchJson";
import type { GuideFile, Widget } from "../schema";
import { guideFile, spineLayer, widgetLayer } from "../schema";
import type { LayerReport } from "./layerRoster";

// The lens resolves row content through the assembled guide, but mid-pipeline
// guide.json does not exist yet (QA writes it). Fall back to the same
// mechanical merge assembly performs (contract §3) over layers/spine.json +
// the roster's widget artifacts — deliberately WITHOUT guideFile.parse:
// cross-layer invariants are QA's gate, and the lens must render
// partially-compiled (even inconsistent) guides so Pierre can review them.
// No spine yet → null (the roster is empty then anyway).
export async function loadReviewGuide(
  slug: string,
  roster: LayerReport[],
): Promise<GuideFile | null> {
  const assembled = await fetchOptionalJson(
    `guides/${slug}/guide.json`,
    guideFile,
    `guide "${slug}"`,
  );
  if (assembled !== null) return assembled;

  const spine = await fetchOptionalJson(
    `guides/${slug}/layers/spine.json`,
    spineLayer,
    `spine layer for "${slug}"`,
  );
  if (spine === null) return null;

  const widgets: Widget[] = await Promise.all(
    roster
      .filter((layer) => layer.kind === "widget")
      .map(async (layer) => {
        const artifact = await fetchJson(
          `guides/${slug}/layers/${layer.id}.json`,
          widgetLayer,
          `widget layer "${layer.id}"`,
        );
        return artifact.widget;
      }),
  );

  return {
    schemaVersion: spine.schemaVersion,
    guideId: spine.guideId,
    locations: spine.locations,
    chapters: spine.chapters,
    widgets: widgets.sort((a, b) => a.deckPosition - b.deckPosition),
  };
}
