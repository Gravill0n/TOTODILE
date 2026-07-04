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
  const response = await fetch(`guides/${slug}/guide.json`);
  if (response.ok) return guideFile.parse(await response.json());
  if (response.status !== 404) {
    throw new Error(`Could not load guide "${slug}" (HTTP ${response.status})`);
  }

  const spineResponse = await fetch(`guides/${slug}/layers/spine.json`);
  if (spineResponse.status === 404) return null;
  if (!spineResponse.ok) {
    throw new Error(
      `Could not load spine layer for "${slug}" (HTTP ${spineResponse.status})`,
    );
  }
  const spine = spineLayer.parse(await spineResponse.json());

  const widgets: Widget[] = await Promise.all(
    roster
      .filter((layer) => layer.kind === "widget")
      .map(async (layer) => {
        const artifactResponse = await fetch(
          `guides/${slug}/layers/${layer.id}.json`,
        );
        if (!artifactResponse.ok) {
          throw new Error(
            `Could not load widget layer "${layer.id}" (HTTP ${artifactResponse.status})`,
          );
        }
        return widgetLayer.parse(await artifactResponse.json()).widget;
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
