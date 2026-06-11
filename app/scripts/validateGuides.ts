// CLI entry for the §21.2 CI gate. Runs on plain Node (24+ native type
// stripping — no build step): `yarn validate-guides [--root <repo-root>]`.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { validateGuides } from "./validateGuidesCore.ts";

const { values } = parseArgs({ options: { root: { type: "string" } } });
const root = values.root
  ? resolve(values.root)
  : join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const report = validateGuides(root);

for (const note of report.notes) {
  console.log(`i ${note}`);
}
if (report.ok) {
  if (report.guidesChecked > 0) {
    console.log(`ok: ${report.guidesChecked} guide(s) validated — all green`);
  }
  process.exit(0);
}
for (const finding of report.findings) {
  console.error(`FAIL [${finding.guide}/${finding.file}] ${finding.message}`);
}
console.error(
  `${report.findings.length} problem(s) found across ${report.guidesChecked} guide(s)`,
);
process.exit(1);
