import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  LayersManifest,
  ManifestEntry,
  ManifestLayerKind,
} from "../src/schema/index.ts";
import {
  layersManifest,
  SCHEMA_VERSION,
  widgetLayer,
} from "../src/schema/index.ts";
import { type Finding, loadEntity } from "./validateGuidesCore.ts";

export type BuildManifestReport = {
  ok: boolean;
  findings: Finding[];
  manifest?: LayersManifest;
  // Files written, relative to the guide folder (empty on dry runs/failure).
  wrote: string[];
};

const WIDGET_LAYER_ID = /^widget-[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Derives guides/<slug>/layers/manifest.json from the disk truth (contract §5:
// the artifact bytes are what an approval hash-locks). One-shot backfill for
// pre-manifest guides and the repair tool when a pass's upsert drifted —
// validate-guides flags the drift, this rebuilds. All-or-nothing like
// assembleGuide: any finding means nothing is written.
export function buildLayersManifest(
  rootDir: string,
  slug: string,
  { write = false } = {},
): BuildManifestReport {
  const findings: Finding[] = [];
  const dir = join(rootDir, "guides", slug);
  const layersDir = join(dir, "layers");

  if (!existsSync(layersDir)) {
    findings.push({
      guide: slug,
      file: "layers/",
      message: "no layers/ directory — nothing to build a manifest from",
    });
    return { ok: false, findings, wrote: [] };
  }

  const names = readdirSync(layersDir)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !name.endsWith(".report.json"))
    .sort();

  const entries: ManifestEntry[] = [];
  for (const name of names) {
    const id = name.slice(0, -".json".length);
    const kind: ManifestLayerKind | undefined =
      id === "spine" || id === "ra-mapping"
        ? id
        : WIDGET_LAYER_ID.test(id)
          ? "widget"
          : undefined;
    // data.json (unreviewed intermediate) and manifest.json itself.
    if (kind === undefined) continue;

    const artifact = `layers/${id}.json`;
    const report = `layers/${id}.report.json`;
    if (!existsSync(join(dir, report))) {
      findings.push({
        guide: slug,
        file: artifact,
        message: `layer "${id}" has no ${id}.report.json — every reviewable layer needs its report (contract §4)`,
      });
      continue;
    }

    let widgetMeta: ManifestEntry["widget"];
    if (kind === "widget") {
      const layer = loadEntity(dir, slug, artifact, widgetLayer, findings);
      if (!layer) continue;
      widgetMeta = {
        deckPosition: layer.widget.deckPosition,
        scope: layer.widget.scope,
        title: layer.widget.title,
      };
    }

    entries.push({
      id,
      kind,
      artifact,
      report,
      sha256: createHash("sha256")
        .update(readFileSync(join(dir, artifact)))
        .digest("hex"),
      ...(widgetMeta ? { widget: widgetMeta } : {}),
    });
  }

  // Roster order (review/layerRoster.ts): spine first, ra-mapping last,
  // widgets alphabetical between — keeps the file diff-stable.
  const rank = (kind: ManifestLayerKind) =>
    kind === "spine" ? 0 : kind === "widget" ? 1 : 2;
  entries.sort((a, b) => {
    const byKind = rank(a.kind) - rank(b.kind);
    return byKind !== 0 ? byKind : a.id.localeCompare(b.id);
  });

  const parsed = layersManifest.safeParse({
    schemaVersion: SCHEMA_VERSION,
    guideId: slug,
    entries,
  });
  if (!parsed.success) {
    findings.push({
      guide: slug,
      file: "layers/manifest.json",
      message: `derived manifest is invalid:\n${parsed.error.issues
        .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`,
    });
  }

  if (findings.length > 0 || !parsed.success) {
    return { ok: false, findings, wrote: [] };
  }

  const wrote: string[] = [];
  if (write) {
    writeFileSync(
      join(layersDir, "manifest.json"),
      `${JSON.stringify(parsed.data, null, 2)}\n`,
    );
    wrote.push("layers/manifest.json");
  }
  return { ok: true, findings, manifest: parsed.data, wrote };
}
