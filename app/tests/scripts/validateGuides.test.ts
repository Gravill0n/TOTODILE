import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateGuides } from "../../scripts/validateGuidesCore.ts";
import {
  validApprovals,
  validDataLayer,
  validDeck,
  validGuide,
  validLibrary,
  validPassReport,
  validRaMapping,
  validSources,
  validSpineLayer,
  validWidgetLayer,
} from "../schema/helpers";

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

function happyTree() {
  return {
    "library.json": validLibrary(),
    "guides/fictional-quest/guide.json": validGuide(),
    "guides/fictional-quest/sources.json": validSources(),
    "guides/fictional-quest/deck.json": validDeck(),
    "guides/fictional-quest/ra-mapping.json": validRaMapping(),
    "guides/fictional-quest/approvals.json": validApprovals(),
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
});

describe("validateGuides — compiler layers (COMPILER_PASS_CONTRACT.md)", () => {
  const layersBase = "guides/fictional-quest/layers";

  function happyLayers() {
    return {
      ...happyTree(),
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
});
