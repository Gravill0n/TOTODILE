import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateGuides } from "../../scripts/validateGuidesCore.ts";
import {
  validApprovals,
  validDeck,
  validGuide,
  validLibrary,
  validRaMapping,
  validSources,
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
    const chapter = guide.chapters[0];
    if (chapter === undefined) return expect.fail("fixture has no chapter");
    chapter.steps = [
      { ...chapter.steps[0], sourceRefs: ["src-ghost"] },
    ] as never;
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/guide.json": guide,
    });
    expect(messagesOf(root).join("\n")).toContain('unknown source "src-ghost"');
  });

  it("flags an RA-mapping target that resolves nowhere (§6.5)", () => {
    const mapping = validRaMapping();
    mapping.entries = [
      { raAchievementId: 101, targetItemId: "fictional-quest:c9:s9" },
    ];
    const root = writeTree({
      ...happyTree(),
      "guides/fictional-quest/ra-mapping.json": mapping,
    });
    expect(messagesOf(root).join("\n")).toContain(
      'targets unknown item "fictional-quest:c9:s9"',
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
