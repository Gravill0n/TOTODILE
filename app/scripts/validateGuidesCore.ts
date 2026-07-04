import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type {
  DataLayer,
  GuideFile,
  LayersManifest,
  LibraryManifest,
  PassReportFile,
  RaMapping,
  SourceManifest,
  SpineLayer,
  WidgetLayer,
} from "../src/schema/index.ts";
import {
  approvalsFile,
  dataLayer,
  genreDeck,
  guideFile,
  layersManifest,
  libraryManifest,
  passReportFile,
  raMapping,
  SUPPORTED_SCHEMA_VERSIONS,
  sourceManifest,
  spineLayer,
  widgetCheckables,
  widgetItemIds,
  widgetLayer,
} from "../src/schema/index.ts";

export type Finding = {
  // Guide slug, or "library" for repo-level problems.
  guide: string;
  file: string;
  message: string;
};

export type Report = {
  ok: boolean;
  guidesChecked: number;
  findings: Finding[];
  notes: string[];
};

// The CI gate (§21.2): schema-validates library.json and every file in
// guides/<slug>/, plus the cross-file invariants the entity schemas
// delegate here (§6.6 sourceRefs, §6.5 RA-mapping targets, deck slots,
// library ↔ folder correspondence). Pure: no exit codes, no console.
export function validateGuides(rootDir: string): Report {
  const findings: Finding[] = [];
  const notes: string[] = [];

  const guidesDir = join(rootDir, "guides");
  const libraryPath = join(rootDir, "library.json");
  const hasGuidesDir = existsSync(guidesDir);
  const hasLibrary = existsSync(libraryPath);

  // Vacuous pass while the repo has no compiled content yet (Phase 0).
  if (!hasGuidesDir && !hasLibrary) {
    notes.push(
      "no guides/ directory or library.json yet — nothing to validate",
    );
    return { ok: true, guidesChecked: 0, findings, notes };
  }

  let library: LibraryManifest | undefined;
  if (hasLibrary) {
    library = loadEntity(
      rootDir,
      "library",
      "library.json",
      libraryManifest,
      findings,
    );
  } else {
    findings.push({
      guide: "library",
      file: "library.json",
      message: "guides/ exists but library.json is missing",
    });
  }

  const folders = hasGuidesDir
    ? readdirSync(guidesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

  if (library) {
    const folderSet = new Set(folders);
    for (const entry of library.guides) {
      // Planned entries are backlog rows — no build exists yet, so no folder
      // is required. (If one does exist, it is validated like any other.)
      if (!folderSet.has(entry.id) && entry.status !== "planned") {
        findings.push({
          guide: entry.id,
          file: "library.json",
          message: `library entry "${entry.id}" has no guides/${entry.id}/ folder`,
        });
      }
    }
    const entryIds = new Set(library.guides.map((g) => g.id));
    for (const folder of folders) {
      if (!entryIds.has(folder)) {
        findings.push({
          guide: folder,
          file: "library.json",
          message: `guides/${folder}/ has no library.json entry`,
        });
      }
    }
  }

  for (const slug of folders) {
    validateGuideFolder(join(guidesDir, slug), slug, library, findings);
  }

  return {
    ok: findings.length === 0,
    guidesChecked: folders.length,
    findings,
    notes,
  };
}

function validateGuideFolder(
  dir: string,
  slug: string,
  library: LibraryManifest | undefined,
  findings: Finding[],
): void {
  const entry = library?.guides.find((g) => g.id === slug);
  // guide.json only exists once the QA pass assembles the layers; a guide
  // the library declares "in-compilation" may legitimately not have one yet
  // (FR-E5 keeps it unplayable either way). Playable guides require it.
  const guide = loadEntity(dir, slug, "guide.json", guideFile, findings, {
    optional: entry?.status === "in-compilation",
  });
  const sources = loadEntity(
    dir,
    slug,
    "sources.json",
    sourceManifest,
    findings,
  );
  const deck = loadEntity(dir, slug, "deck.json", genreDeck, findings);
  const mapping = loadEntity(
    dir,
    slug,
    "ra-mapping.json",
    raMapping,
    findings,
    {
      optional: true,
    },
  );
  const approvals = loadEntity(
    dir,
    slug,
    "approvals.json",
    approvalsFile,
    findings,
    {
      optional: true,
    },
  );

  const checkSlug = (file: string, guideId: string | undefined) => {
    if (guideId !== undefined && guideId !== slug) {
      findings.push({
        guide: slug,
        file,
        message: `guideId "${guideId}" does not match folder slug "${slug}"`,
      });
    }
  };
  checkSlug("guide.json", guide?.guideId);
  checkSlug("sources.json", sources?.guideId);
  checkSlug("ra-mapping.json", mapping?.guideId);
  checkSlug("approvals.json", approvals?.guideId);

  // §6.6: every sourceRef resolves in the source manifest.
  if (guide && sources) {
    const sourceIds = new Set(sources.sources.map((s) => s.id));
    const reportDangling = (
      ownerKind: string,
      ownerId: string,
      refs: string[],
    ) => {
      for (const ref of refs) {
        if (!sourceIds.has(ref)) {
          findings.push({
            guide: slug,
            file: "guide.json",
            message: `${ownerKind} "${ownerId}" references unknown source "${ref}"`,
          });
        }
      }
    };
    for (const chapter of guide.chapters) {
      for (const visit of chapter.visits) {
        for (const step of visit.steps) {
          reportDangling("step", step.id, step.sourceRefs);
        }
      }
    }
    for (const widget of guide.widgets) {
      for (const row of widgetCheckables(widget)) {
        reportDangling("item", row.itemId, row.sourceRefs);
      }
    }
  }

  // §6.5: every RA-mapping target resolves in the checkable namespace.
  if (guide && mapping) {
    const checkableIds = checkableNamespace(guide);
    for (const entry of mapping.entries) {
      if (!checkableIds.has(entry.targetItemId)) {
        findings.push({
          guide: slug,
          file: "ra-mapping.json",
          message: `RA achievement ${entry.raAchievementId} targets unknown item "${entry.targetItemId}"`,
        });
      }
    }
  }

  // FR-D2/D3: mapping rows are emitted rows — their sourceRefs resolve too.
  if (mapping && sources) {
    const sourceIds = new Set(sources.sources.map((s) => s.id));
    for (const entry of mapping.entries) {
      for (const ref of entry.sourceRefs) {
        if (!sourceIds.has(ref)) {
          findings.push({
            guide: slug,
            file: "ra-mapping.json",
            message: `achievement ${entry.raAchievementId} references unknown source "${ref}"`,
          });
        }
      }
    }
  }

  // §6.3: a widget instance fills an existing deck slot of its own primitive.
  if (guide && deck) {
    for (const widget of guide.widgets) {
      const slot = deck.slots[widget.deckPosition];
      if (slot === undefined) {
        findings.push({
          guide: slug,
          file: "guide.json",
          message: `widget "${widget.id}" has deckPosition ${widget.deckPosition} but the deck has ${deck.slots.length} slot(s)`,
        });
      } else if (slot.primitive !== widget.type) {
        findings.push({
          guide: slug,
          file: "guide.json",
          message: `widget "${widget.id}" is a ${widget.type} but deck slot ${widget.deckPosition} holds a ${slot.primitive}`,
        });
      }
    }
  }

  if (entry && deck && entry.deckId !== deck.id) {
    findings.push({
      guide: slug,
      file: "library.json",
      message: `library deckId "${entry.deckId}" does not match deck.json id "${deck.id}"`,
    });
  }
  if (entry && mapping) {
    if (entry.raGameId === undefined) {
      findings.push({
        guide: slug,
        file: "library.json",
        message:
          "ra-mapping.json exists but the library entry declares no raGameId",
      });
    } else if (entry.raGameId !== mapping.raGameId) {
      findings.push({
        guide: slug,
        file: "ra-mapping.json",
        message: `raGameId ${mapping.raGameId} does not match the library entry's ${entry.raGameId}`,
      });
    }
  }

  validateLayers(dir, slug, sources, findings);
}

type LayerArtifact =
  | { kind: "data"; value: DataLayer }
  | { kind: "spine"; value: SpineLayer }
  | { kind: "widget"; value: WidgetLayer }
  | { kind: "ra-mapping"; value: RaMapping };

const WIDGET_LAYER_ID = /^widget-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
// Reports that legitimately have no layer artifact (contract §1): the
// source-gathering artifact is sources.json itself; qa emits a report only.
const ARTIFACTLESS_LAYERS = new Set(["source-gathering", "qa"]);

// Compiler pass outputs under guides/<slug>/layers/ (COMPILER_PASS_CONTRACT.md
// §3–4): every *.json is either a known artifact or an <id>.report.json pair;
// reports must list exactly the artifact's flagged rows (FR-D2); layer
// sourceRefs resolve in sources.json (§6.6). Non-JSON files (pre-contract
// notes like ML PiT's translation-report.md) are ignored.
function validateLayers(
  dir: string,
  slug: string,
  sources: SourceManifest | undefined,
  findings: Finding[],
): void {
  const layersDir = join(dir, "layers");
  if (!existsSync(layersDir)) return;

  const artifacts = new Map<string, LayerArtifact>();
  const reports = new Map<string, PassReportFile>();
  let manifest: LayersManifest | undefined;

  const names = readdirSync(layersDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  for (const name of names) {
    const file = `layers/${name}`;
    const expectGuideId = (guideId: string) => {
      if (guideId !== slug) {
        findings.push({
          guide: slug,
          file,
          message: `guideId "${guideId}" does not match folder slug "${slug}"`,
        });
      }
    };

    if (name === "manifest.json") {
      const value = loadEntity(dir, slug, file, layersManifest, findings);
      if (!value) continue;
      expectGuideId(value.guideId);
      manifest = value;
      continue;
    }

    if (name.endsWith(".report.json")) {
      const layerId = name.slice(0, -".report.json".length);
      const report = loadEntity(dir, slug, file, passReportFile, findings);
      if (!report) continue;
      expectGuideId(report.guideId);
      if (report.layer !== layerId) {
        findings.push({
          guide: slug,
          file,
          message: `report layer "${report.layer}" does not match the filename`,
        });
      }
      reports.set(layerId, report);
      continue;
    }

    const layerId = name.slice(0, -".json".length);
    const widgetSegment = layerId.match(WIDGET_LAYER_ID)?.[1];
    if (layerId === "data") {
      const value = loadEntity(dir, slug, file, dataLayer, findings);
      if (!value) continue;
      expectGuideId(value.guideId);
      artifacts.set(layerId, { kind: "data", value });
    } else if (layerId === "spine") {
      const value = loadEntity(dir, slug, file, spineLayer, findings);
      if (!value) continue;
      expectGuideId(value.guideId);
      artifacts.set(layerId, { kind: "spine", value });
    } else if (widgetSegment !== undefined) {
      const value = loadEntity(dir, slug, file, widgetLayer, findings);
      if (!value) continue;
      expectGuideId(value.guideId);
      const widgetSeg = value.widget.id.split(":")[1];
      if (widgetSeg !== widgetSegment) {
        findings.push({
          guide: slug,
          file,
          message: `widget ID "${value.widget.id}" does not match layer "${layerId}"`,
        });
      }
      artifacts.set(layerId, { kind: "widget", value });
    } else if (layerId === "ra-mapping") {
      const value = loadEntity(dir, slug, file, raMapping, findings);
      if (!value) continue;
      expectGuideId(value.guideId);
      artifacts.set(layerId, { kind: "ra-mapping", value });
    } else {
      findings.push({
        guide: slug,
        file,
        message:
          "unrecognized layer file — expected data.json, spine.json, widget-<seg>.json, ra-mapping.json, or <id>.report.json",
      });
    }
  }

  // extract-data is mandatory and runs before spine/widget/ra-mapping (pass 2
  // of 6): if any of those downstream artifacts exist, layers/data.json must
  // too. A tree that has only run source-gathering (no layer artifacts yet) is
  // a legitimate pre-extract-data state and is left alone.
  const hasDownstreamLayer = [...artifacts.keys()].some(
    (id) => id === "spine" || id === "ra-mapping" || WIDGET_LAYER_ID.test(id),
  );
  if (hasDownstreamLayer && !artifacts.has("data")) {
    findings.push({
      guide: slug,
      file: "layers/data.json",
      message:
        "missing the mandatory extract-data layer — a spine/widget/ra-mapping layer exists but layers/data.json does not (run extract-data first)",
    });
  }

  for (const [layerId, artifact] of artifacts) {
    const file = `layers/${layerId}.json`;
    const report = reports.get(layerId);
    if (!report) {
      findings.push({
        guide: slug,
        file,
        message: `layer "${layerId}" has no ${layerId}.report.json`,
      });
    } else {
      const flagged = flaggedIdsOf(artifact);
      const listed = new Set(report.report.flaggedItemIds);
      for (const id of flagged) {
        if (!listed.has(id)) {
          findings.push({
            guide: slug,
            file: `layers/${layerId}.report.json`,
            message: `artifact row "${id}" is flagged but missing from flaggedItemIds (FR-D2)`,
          });
        }
      }
      for (const id of listed) {
        if (!flagged.has(id)) {
          findings.push({
            guide: slug,
            file: `layers/${layerId}.report.json`,
            message: `flaggedItemIds lists "${id}" but the artifact row is not flagged`,
          });
        }
      }
    }

    if (sources) {
      const sourceIds = new Set(sources.sources.map((s) => s.id));
      for (const [ownerId, refs] of sourceRefsOf(artifact)) {
        for (const ref of refs) {
          if (!sourceIds.has(ref)) {
            findings.push({
              guide: slug,
              file,
              message: `"${ownerId}" references unknown source "${ref}"`,
            });
          }
        }
      }
    }
  }

  for (const layerId of reports.keys()) {
    if (!artifacts.has(layerId) && !ARTIFACTLESS_LAYERS.has(layerId)) {
      findings.push({
        guide: slug,
        file: `layers/${layerId}.report.json`,
        message: `report has no matching layers/${layerId}.json artifact`,
      });
    }
  }

  validateManifest(dir, slug, manifest, artifacts, findings);
}

// Contract §2 rule 9: layers/manifest.json mirrors the reviewable artifacts on
// disk — every reviewable pass upserts its entry, so the review lens can build
// its roster at any pipeline point. The digest and widget metadata are checked
// against the artifact bytes so the denormalization cannot drift silently
// (repair: yarn build-layers-manifest <slug>).
function validateManifest(
  dir: string,
  slug: string,
  manifest: LayersManifest | undefined,
  artifacts: Map<string, LayerArtifact>,
  findings: Finding[],
): void {
  const reviewableIds = [...artifacts.keys()].filter((id) => id !== "data");

  if (manifest === undefined) {
    // A parse failure already produced its own finding via loadEntity; only
    // an absent file is reported here.
    if (
      reviewableIds.length > 0 &&
      !existsSync(join(dir, "layers/manifest.json"))
    ) {
      findings.push({
        guide: slug,
        file: "layers/manifest.json",
        message: `missing layers/manifest.json — reviewable layers exist but the review lens has no roster (run yarn build-layers-manifest ${slug})`,
      });
    }
    return;
  }

  const entryIds = new Set(manifest.entries.map((e) => e.id));
  for (const id of reviewableIds) {
    if (!entryIds.has(id)) {
      findings.push({
        guide: slug,
        file: `layers/${id}.json`,
        message: `layer "${id}" has no layers/manifest.json entry (contract §2 rule 9)`,
      });
    }
  }

  for (const entry of manifest.entries) {
    const artifact = artifacts.get(entry.id);
    const path = join(dir, entry.artifact);
    if (artifact === undefined) {
      if (!existsSync(path)) {
        findings.push({
          guide: slug,
          file: "layers/manifest.json",
          message: `manifest entry "${entry.id}" has no ${entry.artifact} artifact`,
        });
      }
      // An existing-but-invalid artifact already produced its own finding.
      continue;
    }

    const digest = createHash("sha256")
      .update(readFileSync(path))
      .digest("hex");
    if (digest !== entry.sha256) {
      findings.push({
        guide: slug,
        file: "layers/manifest.json",
        message: `manifest digest for "${entry.id}" is stale — the artifact changed since its pass upserted the entry (re-run the pass or yarn build-layers-manifest ${slug})`,
      });
    }

    if (artifact.kind === "widget" && entry.widget !== undefined) {
      const widget = artifact.value.widget;
      const matches =
        entry.widget.deckPosition === widget.deckPosition &&
        entry.widget.title === widget.title &&
        JSON.stringify(entry.widget.scope) === JSON.stringify(widget.scope);
      if (!matches) {
        findings.push({
          guide: slug,
          file: "layers/manifest.json",
          message: `manifest widget metadata for "${entry.id}" does not match the artifact (deckPosition/scope/title)`,
        });
      }
    }
  }
}

// FR-D2 flag parity is uniform across the three layer kinds; for ra-mapping
// the flag set is the targetItemIds of flagged entries (several achievements
// may share a target — the set semantics absorb that).
function flaggedIdsOf(artifact: LayerArtifact): Set<string> {
  switch (artifact.kind) {
    case "data":
      // The extract-data layer is unreviewed and its record IDs are local
      // (not 3-segment checkables), so it carries no item-level flag parity —
      // flagged records surface through the report's anomalies instead.
      return new Set();
    case "spine":
      return new Set(
        artifact.value.chapters
          .flatMap((c) => c.visits.flatMap((v) => v.steps))
          .filter((s) => s.confidence === "flagged")
          .map((s) => s.id),
      );
    case "widget":
      return new Set(
        widgetCheckables(artifact.value.widget)
          .filter((c) => c.confidence === "flagged")
          .map((c) => c.itemId),
      );
    case "ra-mapping":
      return new Set(
        artifact.value.entries
          .filter((e) => e.confidence === "flagged")
          .map((e) => e.targetItemId),
      );
  }
}

function sourceRefsOf(artifact: LayerArtifact): [string, string[]][] {
  switch (artifact.kind) {
    case "data":
      return artifact.value.datasets.flatMap((d) =>
        d.records.map((r): [string, string[]] => [r.id, r.sourceRefs]),
      );
    case "spine":
      return artifact.value.chapters.flatMap((c) =>
        c.visits.flatMap((v) =>
          v.steps.map((s): [string, string[]] => [s.id, s.sourceRefs]),
        ),
      );
    case "widget":
      return widgetCheckables(artifact.value.widget).map(
        (c): [string, string[]] => [c.itemId, c.sourceRefs],
      );
    case "ra-mapping":
      return artifact.value.entries.map((e): [string, string[]] => [
        `achievement ${e.raAchievementId}`,
        e.sourceRefs,
      ]);
  }
}

function checkableNamespace(guide: GuideFile): Set<string> {
  return new Set([
    ...guide.chapters.flatMap((c) =>
      c.visits.flatMap((v) => v.steps.map((s) => s.id)),
    ),
    ...guide.widgets.flatMap(widgetItemIds),
  ]);
}

// Shared with assembleGuideCore.ts — same loading + findings discipline.
export function loadEntity<S extends z.ZodType>(
  dir: string,
  guide: string,
  file: string,
  schema: S,
  findings: Finding[],
  { optional = false } = {},
): z.output<S> | undefined {
  const path = join(dir, file);
  if (!existsSync(path)) {
    if (!optional) {
      findings.push({ guide, file, message: "missing required file" });
    }
    return undefined;
  }
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    findings.push({
      guide,
      file,
      message: `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
    return undefined;
  }
  // Peek at the declared version first so a future-version file fails with
  // one actionable line instead of a wall of shape errors (§18.3).
  if (typeof value === "object" && value !== null && "schemaVersion" in value) {
    const declared = (value as { schemaVersion: unknown }).schemaVersion;
    const supported = SUPPORTED_SCHEMA_VERSIONS as readonly number[];
    if (typeof declared !== "number" || !supported.includes(declared)) {
      findings.push({
        guide,
        file,
        message: `unsupported schemaVersion ${JSON.stringify(declared)} (supported: ${supported.join(", ")})`,
      });
      return undefined;
    }
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    findings.push({ guide, file, message: z.prettifyError(result.error) });
    return undefined;
  }
  return result.data;
}
