import type { LibraryManifest } from "../schema";
import { libraryManifest } from "../schema";

// Fetched relative to the app base: in production library.json sits beside
// dist/ (§21.3); in dev a vite middleware serves the repo-root file (see
// vite.config.ts). A malformed or missing manifest throws into the route's
// error component — a visible "broken" state, never a blank screen (§11.1).
export async function loadLibrary(): Promise<LibraryManifest> {
  const response = await fetch("library.json");
  if (!response.ok) {
    throw new Error(`Could not load library.json (HTTP ${response.status})`);
  }
  return libraryManifest.parse(await response.json());
}
