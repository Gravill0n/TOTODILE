import type { GuideFile } from "../schema";
import { guideFile } from "../schema";

// Same contract as the library loader: relative URLs work in dev (vite
// middleware) and beside dist/ in production (§21.3); malformed data throws
// into the route's visible broken state (§11.1).
export async function loadGuide(slug: string): Promise<GuideFile> {
  const response = await fetch(`guides/${slug}/guide.json`);
  if (!response.ok) {
    throw new Error(`Could not load guide "${slug}" (HTTP ${response.status})`);
  }
  return guideFile.parse(await response.json());
}

// Guide images are referenced relative to the guide folder (§6.2, FR-A6).
export function guideAssetUrl(slug: string, relativePath: string): string {
  return `guides/${slug}/${relativePath}`;
}

export function stepDomId(stepId: string): string {
  return `step-${stepId}`;
}

export function chapterDomId(chapterId: string): string {
  return `chapter-${chapterId}`;
}
