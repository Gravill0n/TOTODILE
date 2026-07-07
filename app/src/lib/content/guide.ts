import type { GuideFile } from "@/schema";
import { guideFile } from "@/schema";
import { fetchJson } from "./fetchJson";

export async function loadGuide(slug: string): Promise<GuideFile> {
  return fetchJson(`guides/${slug}/guide.json`, guideFile, `guide "${slug}"`);
}
