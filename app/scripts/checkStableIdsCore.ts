import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  approvalsFile,
  guideFile,
  libraryManifest,
  spineLayer,
  widgetItemIds,
  widgetLayer,
} from "../src/schema/index.ts";
import type { Finding, Report } from "./validateGuidesCore.ts";
import { loadEntity } from "./validateGuidesCore.ts";

// §6.8 / §15 risk 3 — the recompile hard gate. Stable IDs key player progress
// and RA mappings; a recompile that drops or re-spells one silently wipes
// both ("the single most fragile joint in the system", §10.3). This check
// compares the current tree against an already-shipped baseline (read from a
// git ref by the CLI) and fails on any missing protected ID.
//
// Protected (union):
//   1. IDs of every layer the baseline approvals.json marks "approved".
//   2. All IDs in the baseline guide.json when its library entry is
//      "playable" — pre-review-lens guides (ML PiT) carry live progress
//      without approvals.json and deserve the same protection.
// New IDs in the current tree are always fine; ra-mapping layers mint no IDs.
export function checkStableIds(
  baselineRoot: string,
  currentRoot: string,
  slug: string,
): Report {
  const findings: Finding[] = [];
  const notes: string[] = [];
  const baseDir = join(baselineRoot, "guides", slug);

  // id → the baseline file that owns it (for the finding message).
  const protectedIds = new Map<string, string>();
  const protect = (owner: string, ids: Iterable<string>) => {
    for (const id of ids) {
      if (!protectedIds.has(id)) protectedIds.set(id, owner);
    }
  };

  // 1) Approved layers in the baseline.
  if (existsSync(join(baseDir, "approvals.json"))) {
    const approvals = loadEntity(
      baseDir,
      slug,
      "approvals.json",
      approvalsFile,
      findings,
    );
    for (const record of approvals?.layers ?? []) {
      if (record.status !== "approved") continue;
      const artifactPath = join(baseDir, record.artifact);
      if (!existsSync(artifactPath)) {
        findings.push({
          guide: slug,
          file: record.artifact,
          message: `approved layer "${record.id}" has no artifact in the baseline`,
        });
        continue;
      }
      const digest = `sha256:${createHash("sha256")
        .update(readFileSync(artifactPath))
        .digest("hex")}`;
      if (digest !== record.contentHash) {
        findings.push({
          guide: slug,
          file: record.artifact,
          message: `baseline artifact does not match the approval hash for layer "${record.id}" (contract §5)`,
        });
        // Still protect what the file contains — conservative either way.
      }
      if (record.kind === "spine") {
        const layer = loadEntity(
          baseDir,
          slug,
          record.artifact,
          spineLayer,
          findings,
        );
        if (layer) protect(record.artifact, spineIds(layer.chapters));
      } else if (record.kind === "widget-pass") {
        const layer = loadEntity(
          baseDir,
          slug,
          record.artifact,
          widgetLayer,
          findings,
        );
        if (layer) {
          protect(record.artifact, [
            layer.widget.id,
            ...widgetItemIds(layer.widget),
          ]);
        }
      }
      // record.kind === "ra-mapping": entries key on external RA IDs and
      // target other layers' checkables — nothing minted, nothing to protect.
    }
  }

  // 2) Playable baseline guide.json (§6.8 spirit — live progress exists).
  const library = existsSync(join(baselineRoot, "library.json"))
    ? loadEntity(
        baselineRoot,
        "library",
        "library.json",
        libraryManifest,
        findings,
      )
    : undefined;
  if (library?.guides.find((g) => g.id === slug)?.status === "playable") {
    const guide = loadEntity(baseDir, slug, "guide.json", guideFile, findings);
    if (guide) {
      protect("guide.json (playable)", [
        ...spineIds(guide.chapters),
        ...guide.widgets.flatMap((w) => [w.id, ...widgetItemIds(w)]),
      ]);
    }
  }

  if (protectedIds.size === 0 && findings.length === 0) {
    notes.push(
      `baseline has no approved layers and no playable guide.json for "${slug}" — nothing to protect yet`,
    );
    return { ok: true, guidesChecked: 1, findings, notes };
  }

  // Current ID universe: layers and the assembled guide.json both count —
  // a recompile mid-flight may have fresh layers with a stale assembly or
  // the reverse; an ID present in either is preserved.
  const universe = collectCurrentIds(
    join(currentRoot, "guides", slug),
    slug,
    findings,
  );

  for (const [id, owner] of protectedIds) {
    if (!universe.has(id)) {
      findings.push({
        guide: slug,
        file: owner,
        message: `stable ID "${id}" is gone from the recompile — IDs are never regenerated (§6.8)`,
      });
    }
  }

  return { ok: findings.length === 0, guidesChecked: 1, findings, notes };
}

function spineIds(chapters: { id: string; steps: { id: string }[] }[]) {
  return chapters.flatMap((c) => [c.id, ...c.steps.map((s) => s.id)]);
}

function collectCurrentIds(
  dir: string,
  slug: string,
  findings: Finding[],
): Set<string> {
  const ids = new Set<string>();
  const add = (values: Iterable<string>) => {
    for (const value of values) ids.add(value);
  };

  if (existsSync(join(dir, "guide.json"))) {
    const guide = loadEntity(dir, slug, "guide.json", guideFile, findings);
    if (guide) {
      add(spineIds(guide.chapters));
      add(guide.widgets.flatMap((w) => [w.id, ...widgetItemIds(w)]));
    }
  }

  const layersDir = join(dir, "layers");
  if (!existsSync(layersDir)) return ids;
  for (const name of readdirSync(layersDir).sort()) {
    if (name === "spine.json") {
      const layer = loadEntity(
        dir,
        slug,
        `layers/${name}`,
        spineLayer,
        findings,
      );
      if (layer) add(spineIds(layer.chapters));
    } else if (
      /^widget-.*\.json$/.test(name) &&
      !name.endsWith(".report.json")
    ) {
      const layer = loadEntity(
        dir,
        slug,
        `layers/${name}`,
        widgetLayer,
        findings,
      );
      if (layer) add([layer.widget.id, ...widgetItemIds(layer.widget)]);
    }
  }
  return ids;
}
