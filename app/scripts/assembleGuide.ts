// CLI for the QA pass's mechanical half (COMPILER_PASS_CONTRACT.md §1).
// Runs on plain Node like validateGuides.ts:
//   yarn assemble-guide <slug> [--root <repo-root>] [--dry-run]
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { assembleGuide } from "./assembleGuideCore.ts";

const { values, positionals } = parseArgs({
  options: {
    root: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
  allowPositionals: true,
});

const slug = positionals[0];
if (!slug) {
  console.error("usage: yarn assemble-guide <slug> [--root <dir>] [--dry-run]");
  process.exit(2);
}

const root = values.root
  ? resolve(values.root)
  : join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const report = assembleGuide(root, slug, { write: !values["dry-run"] });

if (report.ok) {
  const what =
    report.wrote.length > 0
      ? `wrote ${report.wrote.join(", ")}`
      : "dry run — nothing written";
  console.log(`ok: ${slug} assembled (${what})`);
  process.exit(0);
}
for (const finding of report.findings) {
  console.error(`FAIL [${finding.guide}/${finding.file}] ${finding.message}`);
}
console.error(`${report.findings.length} problem(s) — nothing written`);
process.exit(1);
