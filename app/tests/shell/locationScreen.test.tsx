// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { guideFile, type LibraryEntry } from "../../src/schema";
import { LocationScreen } from "../../src/shell/LocationScreen";
import { buildLocationIndex } from "../../src/spine/locationIndex";

const entry: LibraryEntry = {
  id: "sample-quest",
  title: "Sample Quest",
  game: "Sample Quest",
  platform: "GBA",
  deckId: "deck",
  language: "en",
  status: "playable",
};

// Harbor Town is visited twice with a harbor-scoped widget and achievements on
// each visit — the place screen must aggregate both visits.
function harborEntry() {
  const step = (id: string, achievementRefs: number[] = []) => ({
    id,
    order: 0,
    keywords: [id.split(":").pop() ?? "beat"],
    achievementRefs,
    sourceRefs: ["src-x"],
    confidence: "normal" as const,
  });
  const guide = guideFile.parse({
    schemaVersion: 1,
    guideId: "sample-quest",
    locations: [{ id: "sample-quest:harbor-town", name: "Harbor Town" }],
    chapters: [
      {
        id: "sample-quest:c1",
        title: "One",
        order: 0,
        visits: [
          {
            id: "sample-quest:v-harbor-1",
            locationId: "sample-quest:harbor-town",
            order: 0,
            steps: [step("sample-quest:v-harbor-1:first", [10])],
          },
          {
            id: "sample-quest:v-harbor-2",
            locationId: "sample-quest:harbor-town",
            order: 1,
            steps: [step("sample-quest:v-harbor-2:later", [11])],
          },
        ],
      },
    ],
    widgets: [
      {
        id: "sample-quest:harbor-map",
        type: "checklist",
        title: "Harbor checklist",
        scope: { kind: "location", locationId: "sample-quest:harbor-town" },
        deckPosition: 0,
        rows: [
          {
            itemId: "sample-quest:harbor-map:r1",
            label: "a row",
            sourceRefs: ["src-x"],
            confidence: "normal",
          },
        ],
      },
    ],
  });
  const indexEntry = buildLocationIndex(guide).get("sample-quest:harbor-town");
  if (!indexEntry) throw new Error("fixture has no harbor entry");
  return indexEntry;
}

afterEach(cleanup);

describe("LocationScreen (place screen #8, D5)", () => {
  it("renders the location name", () => {
    render(<LocationScreen entry={entry} indexEntry={harborEntry()} />);
    expect(screen.getByRole("heading", { name: "Harbor Town" })).toBeDefined();
  });

  it("aggregates every visit and its steps", () => {
    render(<LocationScreen entry={entry} indexEntry={harborEntry()} />);
    // both visits' steps render (one keyword each)
    expect(screen.getByText("first")).toBeDefined();
    expect(screen.getByText("later")).toBeDefined();
  });

  it("lists the location-scoped widgets", () => {
    render(<LocationScreen entry={entry} indexEntry={harborEntry()} />);
    expect(screen.getByText("Harbor checklist")).toBeDefined();
  });

  it("surfaces how many achievements are earnable here", () => {
    render(<LocationScreen entry={entry} indexEntry={harborEntry()} />);
    // two unique achievements (10, 11) across the two visits
    expect(screen.getByText(/2 achievements/i)).toBeDefined();
  });

  it("links back to the play view", () => {
    render(<LocationScreen entry={entry} indexEntry={harborEntry()} />);
    const back = screen.getByRole("link", { name: /back/i });
    expect(back.getAttribute("href")).toContain("/guide/sample-quest");
  });
});
