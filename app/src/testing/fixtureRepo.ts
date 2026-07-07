import { readFileSync } from "node:fs";
import { join } from "node:path";

// Single source for the fixture repo location — tests must never rebuild
// this path from their own import.meta.url (it breaks when files move).
// Anchored on cwd because all commands run from app/ (PRD §21) and
// import.meta.url is not a file: URL under the jsdom test environment.
export const fixtureRepoRoot = join(
  process.cwd(),
  "src",
  "testing",
  "fixtures",
  "repo",
);

export function readFixtureJson(relPath: string): unknown {
  return JSON.parse(readFileSync(join(fixtureRepoRoot, relPath), "utf8"));
}
