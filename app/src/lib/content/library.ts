import type { LibraryManifest } from "@/schema";
import { libraryManifest } from "@/schema";
import { fetchJson } from "./fetchJson";

// In production library.json sits beside dist/ (§21.3); in dev a vite
// middleware serves the repo-root file (see vite.config.ts).
export async function loadLibrary(): Promise<LibraryManifest> {
  return fetchJson("library.json", libraryManifest, "library.json");
}
