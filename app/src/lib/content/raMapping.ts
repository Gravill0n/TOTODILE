import type { RaMapping } from "@/schema";
import { raMapping } from "@/schema";
import { fetchOptionalJson } from "./fetchJson";

// ra-mapping.json is optional — a guide with no RA set has none (§6.5).
// Mid-pipeline the top-level copy does not exist yet (assembly is the file
// copy, contract §3), so the layer artifact is checked next — same schema.
// Shared here because both the review lens and RA sync consume it.
export async function loadRaMapping(slug: string): Promise<RaMapping | null> {
  for (const path of ["ra-mapping.json", "layers/ra-mapping.json"]) {
    const mapping = await fetchOptionalJson(
      `guides/${slug}/${path}`,
      raMapping,
      `RA mapping for "${slug}"`,
    );
    if (mapping !== null) return mapping;
  }
  return null;
}
