// CLI for the §6.8 recompile hard gate (COMPILER_PASS_CONTRACT.md §2.3):
//   yarn check-stable-ids <slug> [--against <ref>] [--root <repo-root>]
// Compares the working tree against the approved baseline at <ref>
// (default: main), materialized via `git archive` — no checkout disturbance.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { guideSlug } from "../src/schema/index.ts";
import { checkStableIds } from "./checkStableIdsCore.ts";

const { values, positionals } = parseArgs({
  options: {
    against: { type: "string", default: "main" },
    root: { type: "string" },
  },
  allowPositionals: true,
});

const slug = positionals[0];
if (!slug || !guideSlug.safeParse(slug).success) {
  console.error(
    "usage: yarn check-stable-ids <slug> [--against <ref>] [--root <dir>]",
  );
  process.exit(2);
}
const ref = values.against ?? "main";
const root = values.root
  ? resolve(values.root)
  : join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Only archive paths that exist at the ref — `git archive` errors on
// missing pathspecs, and a guide absent from the baseline is simply vacuous.
const wanted = [`guides/${slug}`, "library.json"];
const present = execFileSync(
  "git",
  ["ls-tree", "-r", "--name-only", ref, "--", ...wanted],
  { cwd: root, encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

if (present.length === 0) {
  console.log(`i "${slug}" does not exist at ${ref} — nothing to protect yet`);
  process.exit(0);
}

const baseline = mkdtempSync(join(tmpdir(), "totodile-baseline-"));
try {
  const tar = execFileSync("git", ["archive", ref, "--", ...wanted], {
    cwd: root,
    maxBuffer: 256 * 1024 * 1024,
  });
  execFileSync("tar", ["-x", "-C", baseline], { input: tar });

  const report = checkStableIds(baseline, root, slug);
  for (const note of report.notes) {
    console.log(`i ${note}`);
  }
  if (report.ok) {
    console.log(`ok: ${slug} keeps every protected ID from ${ref} (§6.8)`);
    process.exit(0);
  }
  for (const finding of report.findings) {
    console.error(`FAIL [${finding.guide}/${finding.file}] ${finding.message}`);
  }
  console.error(
    `${report.findings.length} problem(s) — recompile drops protected IDs, refuse to ship (§15 risk 3)`,
  );
  process.exit(1);
} finally {
  rmSync(baseline, { recursive: true, force: true });
}
