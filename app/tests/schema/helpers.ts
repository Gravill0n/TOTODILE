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
// IDs follow the fictional fixture guide that Task 6 fleshes out.

export function validStep(n = 1) {
  return {
    id: `fic:c1:s${n}`,
    order: n - 1,
    text: "Cross the drawbridge and stomp the sentry.",
    location: "Castle Gate",
    missable: { deadline: "Before raising the drawbridge in chapter 2" },
    achievementRefs: [101],
    images: [{ src: "images/castle-gate.png", alt: "Castle gate map" }],
    sourceRefs: ["src-wiki"],
    confidence: "normal",
  };
}

export function validChapter() {
  return {
    id: "fic:c1",
    title: "Chapter 1 — The Castle Gate",
    order: 0,
    steps: [validStep(1), validStep(2)],
  };
}

function widgetBase(n: number) {
  return {
    id: `fic:w${n}`,
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
        itemId: `fic:w${n}:r1`,
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
        itemId: `fic:w${n}:hero-fire`,
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
        itemId: `fic:w${n}:sentry`,
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
        itemId: `fic:w${n}:coins`,
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
        itemId: `fic:w${n}:n1`,
        label: "Give the apple to the guard",
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
      {
        itemId: `fic:w${n}:n2`,
        label: "Trade the badge for the key",
        sourceRefs: ["src-wiki"],
        confidence: "normal",
      },
    ],
    edges: [{ from: `fic:w${n}:n1`, to: `fic:w${n}:n2` }],
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
        itemId: `fic:w${n}:shard1`,
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
        itemId: `fic:w${n}:p1`,
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
    chapters: [validChapter()],
    widgets: [
      { ...validChecklist(1), scope: { kind: "chapter", chapterId: "fic:c1" } },
      validMatrix(2),
      validDataTable(3),
      validCounter(4),
      validFlowchart(5),
      validMapPins(6),
      validPrepCard(7),
    ],
  };
}

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
      {
        primitive: "counter",
        defaultTitle: "Collectibles",
        defaultScope: "global",
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
      { raAchievementId: 101, targetItemId: "fic:c1:s1" },
      { raAchievementId: 102, targetItemId: "fic:w1:r1" },
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
      flaggedItemIds: ["fic:c1:s2"],
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
    spotChecks: [{ itemId: "fic:c1:s1", verdict: "pass" }],
  };
}

export function validApprovals() {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: "fictional-quest",
    layers: [validLayer("draft")],
  };
}
