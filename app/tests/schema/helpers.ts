import { expect } from "vitest";
import type { z } from "zod";
import { SCHEMA_VERSION } from "../../src/schema";

export function expectParses(schema: z.ZodType, value: unknown): void {
  const result = schema.safeParse(value);
  if (!result.success) {
    expect.fail(`expected value to parse, got:\n${result.error.message}`);
  }
}

export function expectRejects(schema: z.ZodType, value: unknown): void {
  expect(schema.safeParse(value).success).toBe(false);
}

// Builders return fresh plain objects so each test can mutate its own copy.
// IDs follow the fictional fixture guide. Step IDs keep their `c1` mint
// segment (the middle segment is a minting convention, not validated
// containment — common.ts), so progress/RA/approval fixtures that key on
// "fictional-quest:c1:sN" survive the chapter→visit→step reframe.

export function validStep(n = 1) {
  return {
    id: `fictional-quest:c1:s${n}`,
    order: n - 1,
    keywords: ["Cross drawbridge", "Stomp sentry"],
    detail:
      "Cross the drawbridge and stomp the sentry before it raises the alarm.",
    missable: { deadline: "Before raising the drawbridge in chapter 2" },
    achievementRefs: [101],
    images: [{ src: "images/castle-gate.png", alt: "Castle gate map" }],
    sourceRefs: ["src-wiki"],
    confidence: "normal",
  };
}

export function validLocation() {
  return {
    id: "fictional-quest:castle-gate",
    name: "Castle Gate",
    mapImage: { src: "images/castle-gate.png", alt: "Castle gate map" },
  };
}

export function validVisit() {
  return {
    id: "fictional-quest:v1",
    locationId: "fictional-quest:castle-gate",
    order: 0,
    steps: [validStep(1), validStep(2)],
  };
}

export function validChapter() {
  return {
    id: "fictional-quest:c1",
    title: "Chapter 1 — The Castle Gate",
    order: 0,
    visits: [validVisit()],
  };
}

function widgetBase(n: number) {
  return {
    id: `fictional-quest:w${n}`,
    title: "Widget",
    scope: { kind: "global" },
    deckPosition: n - 1,
  };
}

export function validChecklist(n = 1) {
  return {
    ...widgetBase(n),
    type: "checklist",
    title: "Treasure checklist",
    rows: [
      {
        itemId: `fictional-quest:w${n}:r1`,
        label: "Gate key",
        note: "Behind the loose brick",
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ],
  };
}

export function validMatrix(n = 2) {
  return {
    ...widgetBase(n),
    type: "matrix",
    title: "Sticker × character matrix",
    rows: [{ id: "row-hero", label: "Hero" }],
    columns: [{ id: "col-fire", label: "Fire badge" }],
    cells: [
      {
        itemId: `fictional-quest:w${n}:hero-fire`,
        rowId: "row-hero",
        columnId: "col-fire",
        sourceRefs: ["src-wiki"],
        confidence: "flagged",
      },
    ],
  };
}

export function validDataTable(n = 3) {
  return {
    ...widgetBase(n),
    type: "dataTable",
    title: "Enemy stats",
    columns: [
      { id: "col-hp", label: "HP" },
      { id: "col-xp", label: "XP" },
    ],
    rows: [
      {
        itemId: `fictional-quest:w${n}:sentry`,
        checkable: false,
        cells: { "col-hp": "10", "col-xp": "3" },
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ],
  };
}

export function validCounter(n = 4) {
  return {
    ...widgetBase(n),
    type: "counter",
    title: "Collectibles",
    counters: [
      {
        itemId: `fictional-quest:w${n}:coins`,
        label: "Blue coins",
        target: 40,
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ],
  };
}

export function validFlowchart(n = 5) {
  return {
    ...widgetBase(n),
    type: "flowchart",
    title: "Trade chain",
    nodes: [
      {
        itemId: `fictional-quest:w${n}:n1`,
        label: "Give the apple to the guard",
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
      {
        itemId: `fictional-quest:w${n}:n2`,
        label: "Trade the badge for the key",
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ],
    edges: [
      { from: `fictional-quest:w${n}:n1`, to: `fictional-quest:w${n}:n2` },
    ],
  };
}

export function validMapPins(n = 6) {
  return {
    ...widgetBase(n),
    type: "mapPins",
    title: "Shard locations",
    image: { src: "images/overworld.png", alt: "Overworld map" },
    pins: [
      {
        itemId: `fictional-quest:w${n}:shard1`,
        label: "Shard under the bridge",
        x: 0.25,
        y: 0.75,
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ],
  };
}

export function validPrepCard(n = 7) {
  return {
    ...widgetBase(n),
    type: "prepCard",
    title: "Before the final boss",
    items: [
      {
        itemId: `fictional-quest:w${n}:p1`,
        label: "Max mushrooms",
        quantity: 10,
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ],
  };
}

export function validGuide() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    locations: [validLocation()],
    chapters: [validChapter()],
    widgets: [
      {
        ...validChecklist(1),
        scope: { kind: "chapter", chapterId: "fictional-quest:c1" },
      },
      validMatrix(2),
      validDataTable(3),
      validCounter(4),
      validFlowchart(5),
      validMapPins(6),
      validPrepCard(7),
    ],
  };
}

// Slot order mirrors the widget deckPositions in validGuide(), so the
// validate-guides deck cross-check passes on the assembled fixture tree.
export function validDeck() {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: "deck-rpg",
    slots: [
      {
        primitive: "checklist",
        defaultTitle: "Key items",
        defaultScope: "chapter",
      },
      { primitive: "matrix", defaultTitle: "Combos", defaultScope: "global" },
      {
        primitive: "dataTable",
        defaultTitle: "Bestiary",
        defaultScope: "global",
      },
      {
        primitive: "counter",
        defaultTitle: "Collectibles",
        defaultScope: "global",
      },
      {
        primitive: "flowchart",
        defaultTitle: "Trade chain",
        defaultScope: "global",
      },
      {
        primitive: "mapPins",
        defaultTitle: "Locations",
        defaultScope: "global",
      },
      {
        primitive: "prepCard",
        defaultTitle: "Boss prep",
        defaultScope: "chapter",
      },
    ],
  };
}

export function validLibrary() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guides: [
      {
        id: "fictional-quest",
        title: "Fictional Quest — 100% guide",
        game: "Fictional Quest",
        platform: "Game Boy Advance",
        raGameId: 9000,
        deckId: "deck-rpg",
        language: "en",
        status: "playable",
        cover: "images/cover.png",
      },
    ],
  };
}

export function validRaMapping() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    raGameId: 9000,
    entries: [
      {
        raAchievementId: 101,
        targetItemId: "fictional-quest:c1:s1",
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
      {
        raAchievementId: 102,
        targetItemId: "fictional-quest:w1:r1",
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ],
  };
}

export function validSources() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    sources: [
      {
        id: "src-wiki",
        title: "Fictional Quest wiki walkthrough",
        url: "https://example.org/fictional-quest",
        type: "wiki",
        retrievedAt: "2026-06-11",
      },
    ],
  };
}

export function validLayer(
  status: "draft" | "approved" | "rejected" = "draft",
) {
  return {
    id: "layer-spine",
    kind: "spine",
    artifact: "layers/spine.json",
    report: {
      rowCount: 2,
      anomalies: ["Chapter 1 has no boss step"],
      flaggedItemIds: ["fictional-quest:c1:s2"],
    },
    contentHash:
      "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
    status,
    ...(status === "draft"
      ? {}
      : {
          approval: {
            date: "2026-06-11T10:00:00Z",
            verdict: status,
            note:
              status === "rejected"
                ? "Step 2 contradicts the source"
                : undefined,
          },
        }),
    spotChecks: [{ itemId: "fictional-quest:c1:s1", verdict: "pass" }],
  };
}

export function validApprovals() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    layers: [validLayer("draft")],
  };
}

export function validProgressSlot() {
  return {
    guideId: "fictional-quest",
    currentStepId: "fictional-quest:c1:s2",
    itemStates: {
      "fictional-quest:c1:s1": {
        state: "done" as const,
        at: "2026-06-12T08:00:00Z",
      },
      "fictional-quest:c2:s3": {
        state: "skipped" as const,
        at: "2026-06-12T08:01:00Z",
      },
    },
    counterValues: { "fictional-quest:counters:blue-coins": 7 },
    acknowledgedMissables: ["fictional-quest:c1:s2"],
    stats: {
      stepsDone: 1,
      stepsTotal: 10,
      currentChapterTitle: "Chapter 1 — The Castle Gate",
    },
    lastActivityAt: "2026-06-12T08:01:00Z",
  };
}

export function validProgressExport() {
  return {
    kind: "totodile-progress",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: "2026-06-12T08:02:00Z",
    slots: [validProgressSlot()],
  };
}

// ─── Compiler pass artifacts + reports (COMPILER_PASS_CONTRACT.md) ──────────

export function validSpineLayer() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    pass: "spine",
    locations: [validLocation()],
    chapters: [validChapter()],
  };
}

export function validWidgetLayer(n = 1) {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    pass: "widget",
    widget: validChecklist(n),
  };
}

export function validPassReport(layer = "spine", pass = layer) {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    pass,
    layer,
    generatedAt: "2026-06-12T10:00:00Z",
    inputs: [{ file: "sources.json", sha256: "ab".repeat(32) }],
    report: { rowCount: 2, anomalies: [], flaggedItemIds: [] },
    notes: ["Fixture report."],
  };
}
