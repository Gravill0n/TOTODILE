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
