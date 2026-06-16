import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GuideFile, RaMapping, WidgetLayer } from "../src/schema/index.ts";
import {
  guideFile,
  passReportFile,
  raMapping,
  spineLayer,
  widgetLayer,
} from "../src/schema/index.ts";
import { type Finding, loadEntity } from "./validateGuidesCore.ts";

export type AssembleReport = {
  ok: boolean;
  findings: Finding[];
  // Files written, relative to the guide folder (empty on dry runs/failure).
  wrote: string[];
};

// The QA pass's mechanical half (COMPILER_PASS_CONTRACT.md §1): check layer
// staleness against the reports' recorded input digests (§6), then merge the
// layers into draft guide.json + ra-mapping.json. All-or-nothing: any finding
// means nothing is written (FR-D4 — broken cross-references never reach
// human review as assembled content).
export function assembleGuide(
  rootDir: string,
  slug: string,
  { write = false } = {},
): AssembleReport {
  const findings: Finding[] = [];
  const dir = join(rootDir, "guides", slug);
  const layersDir = join(dir, "layers");

  if (!existsSync(layersDir)) {
    findings.push({
      guide: slug,
      file: "layers/",
      message: "no layers/ directory — nothing to assemble",
    });
    return { ok: false, findings, wrote: [] };
  }

  const names = readdirSync(layersDir)
    .filter((name) => name.endsWith(".json"))
    .sort();

  // Staleness (contract §6): every input a pass recorded must still have the
  // same bytes, or that pass's output is suspect and assembly refuses.
  for (const name of names.filter((n) => n.endsWith(".report.json"))) {
    const report = loadEntity(
      dir,
      slug,
      `layers/${name}`,
      passReportFile,
      findings,
    );
    if (!report) continue;
    for (const input of report.inputs) {
      const path = join(dir, input.file);
      if (!existsSync(path)) {
        findings.push({
          guide: slug,
          file: `layers/${name}`,
          message: `input "${input.file}" no longer exists`,
        });
        continue;
      }
      const digest = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
      if (digest !== input.sha256) {
        findings.push({
          guide: slug,
          file: `layers/${name}`,
          message: `input "${input.file}" changed since the ${report.layer} pass ran — re-run it (contract §6)`,
        });
      }
    }
  }

  const spine = loadEntity(
    dir,
    slug,
    "layers/spine.json",
    spineLayer,
    findings,
  );

  const widgets: WidgetLayer[] = [];
  for (const name of names.filter(
    (n) => /^widget-.*\.json$/.test(n) && !n.endsWith(".report.json"),
  )) {
    const layer = loadEntity(
      dir,
      slug,
      `layers/${name}`,
      widgetLayer,
      findings,
    );
    if (layer) widgets.push(layer);
  }

  let mapping: RaMapping | undefined;
  if (names.includes("ra-mapping.json")) {
    mapping = loadEntity(
      dir,
      slug,
      "layers/ra-mapping.json",
      raMapping,
      findings,
    );
  }

  if (!spine) {
    return { ok: false, findings, wrote: [] };
  }

  // Merge (contract §3): a mechanical concatenation — IDs already carry the
  // full grammar, so nothing is rewritten.
  const assembled = {
    schemaVersion: spine.schemaVersion,
    guideId: spine.guideId,
    locations: spine.locations,
    chapters: spine.chapters,
    widgets: widgets
      .map((layer) => layer.widget)
      .sort((a, b) => a.deckPosition - b.deckPosition),
  };

  // The guideFile schema owns the cross-layer invariants: duplicate checkable
  // IDs across spine and widgets, scope references, slug discipline.
  const parsed = guideFile.safeParse(assembled);
  let guide: GuideFile | undefined;
  if (parsed.success) {
    guide = parsed.data;
  } else {
    findings.push({
      guide: slug,
      file: "guide.json",
      message: `assembled guide is invalid:\n${parsed.error.issues
        .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    });
  }

  if (findings.length > 0 || guide === undefined) {
    return { ok: false, findings, wrote: [] };
  }

  const wrote: string[] = [];
  if (write) {
    writeJson(join(dir, "guide.json"), guide);
    wrote.push("guide.json");
    if (mapping) {
      writeJson(join(dir, "ra-mapping.json"), mapping);
      wrote.push("ra-mapping.json");
    }
  }
  return { ok: true, findings, wrote };
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
