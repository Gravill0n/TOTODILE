import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  validApprovals,
  validDataLayer,
  validDeck,
  validGuide,
  validLibrary,
  validMapPins,
  validPassReport,
  validRaMapping,
  validSources,
  validSpineLayer,
  validWidgetLayer,
} from "@/testing/helpers";
import { SCHEMA_VERSION } from "../src/schema";
import { validateGuides } from "./validateGuidesCore.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

// Values are JSON-stringified unless already a string (for malformed-JSON
// cases). Keys are paths relative to the temp repo root.
function writeTree(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "totodile-validate-"));
  roots.push(root);
  for (const [relPath, content] of Object.entries(files)) {
    const path = join(root, relPath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      typeof content === "string" ? content : JSON.stringify(content),
    );
  }
  return root;
}

// Every image the fixture factories reference has to exist on disk now that
// the gate resolves imageRefs. Content is irrelevant — the check is existence
// and "not an unsmudged LFS pointer", never image format.
const HAPPY_IMAGES = {
  // validStep().images + validLocation().mapImages[0]
  "guides/fictional-quest/images/castle-gate.png": "png-bytes",
  // validMapPins().image
  "guides/fictional-quest/images/overworld.png": "png-bytes",
  // validLibrary()'s cover — resolved from the repo root, not the guide folder.
  "images/cover.png": "png-bytes",
};

// What a clone holds when git-lfs never smudged: the pointer file itself.
const LFS_POINTER_TEXT = [
  "version https://git-lfs.github.com/spec/v1",
  "oid sha256:0de1fbe5641cd6232e8c88aae4cc049ff6a44ff21f7c32846af6202e79d9df33",
  "size 1020395",
  "",
].join("\n");

function happyTree() {
  return {
    "library.json": validLibrary(),
    "guides/fictional-quest/guide.json": validGuide(),
    "guides/fictional-quest/sources.json": validSources(),
    "guides/fictional-quest/deck.json": validDeck(),
    "guides/fictional-quest/ra-mapping.json": validRaMapping(),
    "guides/fictional-quest/approvals.json": validApprovals(),
    ...HAPPY_IMAGES,
  };
}

function messagesOf(root: string): string[] {
  return validateGuides(root).findings.map(
    (f) => `[${f.guide}/${f.file}] ${f.message}`,
  );
}

describe("validateGuides", () => {
  it("passes vacuously when the repo has no content yet", () => {
    const root = mkdtempSync(join(tmpdir(), "totodile-empty-"));
    roots.push(root);
    const report = validateGuides(root);
    expect(report.ok).toBe(true);
    expect(report.guidesChecked).toBe(0);
    expect(report.notes).toHaveLength(1);
  });

  it("passes a fully consistent guide tree", () => {
    const report = validateGuides(writeTree(happyTree()));
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.guidesChecked).toBe(1);
  });

  it("flags a dangling sourceRef (§6.6)", () => {
    const guide = validGuide();
    const visit = guide.chapters[0]?.visits[0];
    if (visit === undefined) return expect.fail("fixture has no visit");
    visit.steps = [{ ...visit.steps[0], sourceRefs: ["src-ghost"] }] as never;
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/guide.json": guide,
    });
    expect(messagesOf(root).join("\n")).toContain('unknown source "src-ghost"');
  });

  it("flags an RA-mapping target that resolves nowhere (§6.5)", () => {
    const mapping = validRaMapping();
    mapping.entries = [
      {
        raAchievementId: 101,
        targetItemId: "fictional-quest:c9:s9",
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ];
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/ra-mapping.json": mapping,
    });
    expect(messagesOf(root).join("\n")).toContain(
      'targets unknown item "fictional-quest:c9:s9"',
    );
  });

  it("flags a dangling sourceRef in the assembled ra-mapping.json (FR-D2/D3)", () => {
    const mapping = validRaMapping();
    if (mapping.entries[1]) mapping.entries[1].sourceRefs = ["src-ghost"];
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/ra-mapping.json": mapping,
    });
    expect(messagesOf(root).join("\n")).toContain(
      'achievement 102 references unknown source "src-ghost"',
    );
  });

  it("reports an unsupported schemaVersion as one actionable error", () => {
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/guide.json": {
        ...validGuide(),
        schemaVersion: 999,
      },
    });
    const messages = messagesOf(root);
    expect(messages.join("\n")).toContain("unsupported schemaVersion 999");
  });

  it("reports malformed JSON plainly", () => {
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/deck.json": "{ this is not json",
    });
    expect(messagesOf(root).join("\n")).toContain("invalid JSON");
  });

  it("allows a missing guide.json only while the guide is in-compilation (pre-QA bootstrap)", () => {
    const library = validLibrary();
    if (library.guides[0]) library.guides[0].status = "in-compilation";
    const {
      "guides/fictional-quest/guide.json": _guide,
      "guides/fictional-quest/ra-mapping.json": _mapping,
      ...tree
    } = happyTree();
    expect(
      validateGuides(writeTree({ ...tree, "library.json": library })).ok,
    ).toBe(true);

    // Playable says the assembled guide exists — its absence is a finding.
    const { "guides/fictional-quest/guide.json": _g2, ...playableTree } =
      happyTree();
    expect(messagesOf(writeTree(playableTree)).join("\n")).toContain(
      "[fictional-quest/guide.json] missing required file",
    );
  });

  it("does not require a guides/<slug>/ folder for a planned entry", () => {
    const library = validLibrary();
    library.guides.push({
      ...library.guides[0],
      id: "future-quest",
      status: "planned",
    } as never);
    const report = validateGuides(
      writeTree({ ...happyTree(), "library.json": library }),
    );
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("still requires the folder for a non-planned entry", () => {
    const library = validLibrary();
    library.guides.push({
      ...library.guides[0],
      id: "future-quest",
      status: "in-compilation",
    } as never);
    const root = writeTree({ ...happyTree(), "library.json": library });
    expect(messagesOf(root).join("\n")).toContain(
      'library entry "future-quest" has no guides/future-quest/ folder',
    );
  });

  it("requires guide.json, sources.json and deck.json but not the optional files", () => {
    const tree = happyTree();
    const {
      "guides/fictional-quest/sources.json": _sources,
      ...withoutSources
    } = tree;
    expect(messagesOf(writeTree(withoutSources)).join("\n")).toContain(
      "[fictional-quest/sources.json] missing required file",
    );

    const {
      "guides/fictional-quest/ra-mapping.json": _mapping,
      "guides/fictional-quest/approvals.json": _approvals,
      ...withoutOptional
    } = happyTree();
    expect(validateGuides(writeTree(withoutOptional)).ok).toBe(true);
  });

  it("flags a library entry without a folder, and a folder without an entry", () => {
    const library = validLibrary();
    library.guides = [
      ...library.guides,
      { ...library.guides[0], id: "ghost-guide", raGameId: 9001 },
    ] as never;
    const root = writeTree({ ...happyTree(), "library.json": library });
    expect(messagesOf(root).join("\n")).toContain(
      '"ghost-guide" has no guides/ghost-guide/ folder',
    );

    const orphanRoot = writeTree({
      ...happyTree(),
      "guides/orphan-quest/.keep": "",
    });
    expect(messagesOf(orphanRoot).join("\n")).toContain(
      "guides/orphan-quest/ has no library.json entry",
    );
  });

  it("flags a guideId that contradicts the folder slug", () => {
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/sources.json": {
        ...validSources(),
        guideId: "other-game",
      },
    });
    expect(messagesOf(root).join("\n")).toContain(
      'guideId "other-game" does not match folder slug "fictional-quest"',
    );
  });

  it("flags a widget whose deckPosition is out of range or holds the wrong primitive", () => {
    const shortDeck = validDeck();
    shortDeck.slots = [shortDeck.slots[1]] as never; // matrix only, 1 slot
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/deck.json": shortDeck,
    });
    const joined = messagesOf(root).join("\n");
    expect(joined).toContain("deckPosition 1 but the deck has 1 slot(s)");
    expect(joined).toContain(
      '"fictional-quest:w1" is a checklist but deck slot 0 holds a matrix',
    );
  });

  it("flags library ↔ guide metadata drift (deckId, raGameId)", () => {
    const library = validLibrary();
    library.guides = [
      { ...library.guides[0], deckId: "deck-other", raGameId: 1234 },
    ] as never;
    const root = writeTree({ ...happyTree(), "library.json": library });
    const joined = messagesOf(root).join("\n");
    expect(joined).toContain(
      'library deckId "deck-other" does not match deck.json id "deck-rpg"',
    );
    expect(joined).toContain(
      "raGameId 9000 does not match the library entry's 1234",
    );
  });

  it("flags a compiled guide (deck.json exists) whose entry lacks a deckId", () => {
    const library = validLibrary();
    const { deckId, ...entry } = library.guides[0] ?? {};
    library.guides = [entry] as never;
    const root = writeTree({ ...happyTree(), "library.json": library });
    expect(messagesOf(root).join("\n")).toContain(
      "deck.json exists but the library entry declares no deckId",
    );
  });
});

describe("validateGuides — compiler layers (COMPILER_PASS_CONTRACT.md)", () => {
  const layersBase = "guides/fictional-quest/layers";

  // Digest of the bytes writeTree() will produce for a fixture value — the
  // manifest must hash the exact artifact bytes (contract §5).
  function shaOf(value: unknown): string {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  function manifestEntryFor(
    id: string,
    kind: "spine" | "widget" | "ra-mapping",
    artifactValue: unknown,
    widget?: { deckPosition: number; scope: unknown; title: string },
  ) {
    return {
      id,
      kind,
      artifact: `layers/${id}.json`,
      report: `layers/${id}.report.json`,
      sha256: shaOf(artifactValue),
      ...(widget ? { widget } : {}),
    };
  }

  function happyManifest() {
    return {
      schemaVersion: SCHEMA_VERSION,
      guideId: "fictional-quest",
      entries: [
        manifestEntryFor("spine", "spine", validSpineLayer()),
        manifestEntryFor("widget-w1", "widget", validWidgetLayer(1), {
          deckPosition: 0,
          scope: { kind: "global" },
          title: "Treasure checklist",
        }),
        manifestEntryFor("ra-mapping", "ra-mapping", validRaMapping()),
      ],
    };
  }

  function happyLayers() {
    return {
      ...happyTree(),
      [`${layersBase}/manifest.json`]: happyManifest(),
      [`${layersBase}/data.json`]: validDataLayer(),
      [`${layersBase}/data.report.json`]: validPassReport(
        "data",
        "extract-data",
      ),
      [`${layersBase}/spine.json`]: validSpineLayer(),
      [`${layersBase}/spine.report.json`]: validPassReport("spine"),
      [`${layersBase}/widget-w1.json`]: validWidgetLayer(1),
      [`${layersBase}/widget-w1.report.json`]: validPassReport(
        "widget-w1",
        "widget",
      ),
      [`${layersBase}/ra-mapping.json`]: validRaMapping(),
      [`${layersBase}/ra-mapping.report.json`]: validPassReport("ra-mapping"),
      [`${layersBase}/source-gathering.report.json`]:
        validPassReport("source-gathering"),
      [`${layersBase}/qa.report.json`]: validPassReport("qa"),
      // Pre-contract notes stay legal — only *.json is contract-bound.
      [`${layersBase}/translation-report.md`]: "free-form notes",
    };
  }

  it("passes a full set of artifacts + reports, ignoring non-JSON files", () => {
    const report = validateGuides(writeTree(happyLayers()));
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("rejects a layer file outside the contract naming", () => {
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/extras.json`]: { anything: true },
    });
    expect(messagesOf(root).join("\n")).toContain(
      "[fictional-quest/layers/extras.json] unrecognized layer file",
    );
  });

  it("requires the extract-data layer once a downstream layer exists", () => {
    // extract-data is mandatory and runs before spine/widgets; a layers/ tree
    // with a spine/widget/ra-mapping artifact but no data.json skipped it.
    const {
      [`${layersBase}/data.json`]: _data,
      [`${layersBase}/data.report.json`]: _dataReport,
      ...withoutData
    } = happyLayers();
    const root = writeTree(withoutData);
    expect(messagesOf(root).join("\n")).toContain(
      "missing the mandatory extract-data layer",
    );
  });

  it("allows a layers/ tree that has only run source-gathering (pre-extract-data)", () => {
    const root = writeTree({
      ...happyTree(),
      [`${layersBase}/source-gathering.report.json`]:
        validPassReport("source-gathering"),
    });
    expect(messagesOf(root).join("\n")).not.toContain("extract-data layer");
  });

  it("resolves sourceRefs in extract-data records (§6.6)", () => {
    const data = validDataLayer();
    const record = data.datasets[0]?.records[0];
    if (record) record.sourceRefs = ["src-ghost"];
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/data.json`]: data,
    });
    expect(messagesOf(root).join("\n")).toContain('unknown source "src-ghost"');
  });

  it("flags a layer guideId that contradicts the folder slug", () => {
    const foreign = JSON.parse(
      JSON.stringify(validSpineLayer()).replaceAll(
        "fictional-quest",
        "other-game",
      ),
    );
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/spine.json`]: foreign,
    });
    expect(messagesOf(root).join("\n")).toContain(
      '[fictional-quest/layers/spine.json] guideId "other-game" does not match folder slug',
    );
  });

  it("flags a widget layer whose widget does not match the filename", () => {
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/widget-w9.json`]: validWidgetLayer(1),
      [`${layersBase}/widget-w9.report.json`]: validPassReport(
        "widget-w9",
        "widget",
      ),
    });
    expect(messagesOf(root).join("\n")).toContain(
      'widget ID "fictional-quest:w1" does not match layer "widget-w9"',
    );
  });

  it("enforces flag parity between artifact and report (FR-D2)", () => {
    const flaggedSpine = validSpineLayer();
    const step = flaggedSpine.chapters[0]?.visits[0]?.steps[0];
    if (step) step.confidence = "flagged";
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/spine.json`]: flaggedSpine,
    });
    expect(messagesOf(root).join("\n")).toContain(
      '"fictional-quest:c1:s1" is flagged but missing from flaggedItemIds',
    );

    const overReporting = validPassReport("spine");
    overReporting.report.flaggedItemIds = ["fictional-quest:c1:s1"] as never;
    const root2 = writeTree({
      ...happyLayers(),
      [`${layersBase}/spine.report.json`]: overReporting,
    });
    expect(messagesOf(root2).join("\n")).toContain(
      'lists "fictional-quest:c1:s1" but the artifact row is not flagged',
    );
  });

  it("enforces flag parity for ra-mapping entries too (FR-D2)", () => {
    const flaggedMapping = validRaMapping();
    if (flaggedMapping.entries[0]) {
      flaggedMapping.entries[0].confidence = "flagged";
    }
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/ra-mapping.json`]: flaggedMapping,
    });
    expect(messagesOf(root).join("\n")).toContain(
      '"fictional-quest:c1:s1" is flagged but missing from flaggedItemIds',
    );

    const overReporting = validPassReport("ra-mapping");
    overReporting.report.flaggedItemIds = ["fictional-quest:c9:s9"] as never;
    const root2 = writeTree({
      ...happyLayers(),
      [`${layersBase}/ra-mapping.report.json`]: overReporting,
    });
    expect(messagesOf(root2).join("\n")).toContain(
      'lists "fictional-quest:c9:s9" but the artifact row is not flagged',
    );
  });

  it("flags a dangling sourceRef in a ra-mapping layer entry (FR-D2/D3)", () => {
    const mapping = validRaMapping();
    if (mapping.entries[0]) mapping.entries[0].sourceRefs = ["src-ghost"];
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/ra-mapping.json`]: mapping,
    });
    expect(messagesOf(root).join("\n")).toContain(
      '"achievement 101" references unknown source "src-ghost"',
    );
  });

  it("requires the artifact ↔ report pairing both ways", () => {
    const { [`${layersBase}/spine.report.json`]: _report, ...noReport } =
      happyLayers();
    expect(messagesOf(writeTree(noReport)).join("\n")).toContain(
      'layer "spine" has no spine.report.json',
    );

    const { [`${layersBase}/widget-w1.json`]: _artifact, ...noArtifact } =
      happyLayers();
    expect(messagesOf(writeTree(noArtifact)).join("\n")).toContain(
      "report has no matching layers/widget-w1.json artifact",
    );
  });

  it("flags a report whose layer field contradicts its filename", () => {
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/qa.report.json`]: validPassReport("spine"),
    });
    expect(messagesOf(root).join("\n")).toContain(
      'report layer "spine" does not match the filename',
    );
  });

  it("flags a dangling sourceRef inside a layer artifact (§6.6)", () => {
    const layer = validWidgetLayer(1);
    layer.widget.rows = [
      { ...layer.widget.rows[0], sourceRefs: ["src-ghost"] },
    ] as never;
    const root = writeTree({
      ...happyLayers(),
      [`${layersBase}/widget-w1.json`]: layer,
    });
    expect(messagesOf(root).join("\n")).toContain(
      '"fictional-quest:w1:r1" references unknown source "src-ghost"',
    );
  });

  describe("layers/manifest.json (contract §2 rule 9)", () => {
    it("requires a manifest once a reviewable layer exists", () => {
      const { [`${layersBase}/manifest.json`]: _manifest, ...withoutManifest } =
        happyLayers();
      expect(messagesOf(writeTree(withoutManifest)).join("\n")).toContain(
        "missing layers/manifest.json",
      );
    });

    it("does not require a manifest before any reviewable layer exists", () => {
      const root = writeTree({
        ...happyTree(),
        [`${layersBase}/source-gathering.report.json`]:
          validPassReport("source-gathering"),
      });
      expect(messagesOf(root).join("\n")).not.toContain("manifest");
    });

    it("flags a stale digest (artifact changed since the manifest entry)", () => {
      const manifest = happyManifest();
      const entry = manifest.entries.find((e) => e.id === "spine");
      if (entry) entry.sha256 = "0".repeat(64);
      const root = writeTree({
        ...happyLayers(),
        [`${layersBase}/manifest.json`]: manifest,
      });
      expect(messagesOf(root).join("\n")).toContain(
        'manifest digest for "spine" is stale',
      );
    });

    it("flags widget metadata that drifted from the artifact", () => {
      const manifest = happyManifest();
      const entry = manifest.entries.find((e) => e.id === "widget-w1");
      if (entry?.widget) {
        entry.widget.title = "Renamed";
        entry.widget.deckPosition = 5;
      }
      const root = writeTree({
        ...happyLayers(),
        [`${layersBase}/manifest.json`]: manifest,
      });
      const joined = messagesOf(root).join("\n");
      expect(joined).toContain(
        'manifest widget metadata for "widget-w1" does not match the artifact',
      );
    });

    it("flags a manifest entry with no artifact on disk", () => {
      const manifest = happyManifest();
      manifest.entries.push(
        manifestEntryFor(
          "widget-ghost",
          "widget",
          { any: true },
          {
            deckPosition: 1,
            scope: { kind: "global" },
            title: "Ghost",
          },
        ),
      );
      const root = writeTree({
        ...happyLayers(),
        [`${layersBase}/manifest.json`]: manifest,
      });
      expect(messagesOf(root).join("\n")).toContain(
        'manifest entry "widget-ghost" has no layers/widget-ghost.json artifact',
      );
    });

    it("flags a reviewable artifact missing from the manifest", () => {
      const manifest = happyManifest();
      manifest.entries = manifest.entries.filter((e) => e.id !== "widget-w1");
      const root = writeTree({
        ...happyLayers(),
        [`${layersBase}/manifest.json`]: manifest,
      });
      expect(messagesOf(root).join("\n")).toContain(
        'layer "widget-w1" has no layers/manifest.json entry',
      );
    });

    it("flags a manifest guideId that contradicts the folder slug", () => {
      const manifest = happyManifest();
      const foreign = JSON.parse(
        JSON.stringify(manifest).replaceAll("fictional-quest", "other-game"),
      );
      const root = writeTree({
        ...happyLayers(),
        [`${layersBase}/manifest.json`]: foreign,
      });
      expect(messagesOf(root).join("\n")).toContain(
        '[fictional-quest/layers/manifest.json] guideId "other-game" does not match folder slug',
      );
    });
  });

  // The layers are where a pass writes an image reference first; guide.json
  // only gets one at QA assembly. A broken image has to be caught in the layer
  // that owns it, or the owning pass never learns it is at fault.
  describe("image references in the layers", () => {
    it("flags a pointer where the spine layer's image should be", () => {
      const root = writeTree({
        ...happyLayers(),
        "guides/fictional-quest/images/castle-gate.png": LFS_POINTER_TEXT,
      });
      expect(messagesOf(root).join("\n")).toContain(
        "[fictional-quest/layers/spine.json]",
      );
    });

    it("flags a pointer where a widget layer's image should be", () => {
      const mapPinsLayer = { ...validWidgetLayer(1), widget: validMapPins(6) };
      const manifest = happyManifest();
      manifest.entries.push(
        manifestEntryFor("widget-w6", "widget", mapPinsLayer, {
          deckPosition: 5,
          scope: { kind: "global" },
          title: "Widget",
        }),
      );
      const root = writeTree({
        ...happyLayers(),
        [`${layersBase}/manifest.json`]: manifest,
        [`${layersBase}/widget-w6.json`]: mapPinsLayer,
        [`${layersBase}/widget-w6.report.json`]: validPassReport(
          "widget-w6",
          "widget",
        ),
        "guides/fictional-quest/images/overworld.png": LFS_POINTER_TEXT,
      });
      expect(messagesOf(root).join("\n")).toContain(
        '[fictional-quest/layers/widget-w6.json] widget "fictional-quest:w6" references "images/overworld.png"',
      );
    });
  });
});

// guides/*/images/** is Git LFS-tracked (.gitattributes). A clone without
// git-lfs, or one where `git lfs pull` never ran, holds ~130 bytes of pointer
// text where every map should be. Nothing else in the pipeline notices: the
// schemas only check that `src` is a non-empty string, and the PWA precache
// would happily md5 the pointer into the service-worker manifest. So the gate
// owns it.
describe("validateGuides — guide images", () => {
  const guideBase = "guides/fictional-quest";

  it("passes when every referenced image is on disk", () => {
    const report = validateGuides(writeTree(happyTree()));
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("flags a step image that is missing from disk", () => {
    const { [`${guideBase}/images/castle-gate.png`]: _gone, ...tree } =
      happyTree();
    expect(messagesOf(writeTree(tree)).join("\n")).toContain(
      'references a missing image "images/castle-gate.png"',
    );
  });

  it("numbers the map so a nine-map location says which one is missing", () => {
    const tree = happyTree();
    const guide = structuredClone(
      tree[`${guideBase}/guide.json`],
    ) as ReturnType<typeof validGuide>;
    guide.locations[0]?.mapImages.push({
      src: "images/floor-b1.png",
      alt: "Basement",
    });
    expect(
      messagesOf(
        writeTree({ ...tree, [`${guideBase}/guide.json`]: guide }),
      ).join("\n"),
    ).toContain('map 2 references a missing image "images/floor-b1.png"');
  });

  it("flags an unsmudged LFS pointer where a step image should be", () => {
    const root = writeTree({
      ...happyTree(),
      [`${guideBase}/images/castle-gate.png`]: LFS_POINTER_TEXT,
    });
    const joined = messagesOf(root).join("\n");
    expect(joined).toContain("is an unsmudged Git LFS pointer, not an image");
    expect(joined).toContain("git lfs pull");
  });

  it("names the location and the step that reference a broken image", () => {
    const root = writeTree({
      ...happyTree(),
      [`${guideBase}/images/castle-gate.png`]: LFS_POINTER_TEXT,
    });
    const joined = messagesOf(root).join("\n");
    expect(joined).toContain('location "fictional-quest:castle-gate"');
    expect(joined).toContain('step "fictional-quest:c1:s1"');
  });

  it("flags a widget image that is missing from disk", () => {
    const { [`${guideBase}/images/overworld.png`]: _gone, ...tree } =
      happyTree();
    expect(messagesOf(writeTree(tree)).join("\n")).toContain(
      'widget "fictional-quest:w6" references a missing image "images/overworld.png"',
    );
  });

  it("flags a missing library cover, resolved from the repo root", () => {
    const { "images/cover.png": _gone, ...tree } = happyTree();
    expect(messagesOf(writeTree(tree)).join("\n")).toContain(
      '[library/library.json] guide "fictional-quest" references a missing image "images/cover.png"',
    );
  });

  // layers/data.json's `images` dataset catalogues candidate assets by a path
  // into guides/<slug>/sources/, which is gitignored and absent from any fresh
  // clone. Those rows are generic dataset records, not imageRefs, and must stay
  // outside the check or the gate would fail on every machine but the one that
  // ran the sources pass.
  it("ignores the extract-data image catalogue's source paths", () => {
    const root = writeTree({
      ...happyTree(),
      [`${guideBase}/layers/data.json`]: validDataLayer(),
      [`${guideBase}/layers/data.report.json`]: validPassReport(
        "data",
        "extract-data",
      ),
    });
    expect(messagesOf(root).join("\n")).not.toContain("images/maps");
  });
});
