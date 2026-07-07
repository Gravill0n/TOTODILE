// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { createAppRouter } from "@/app/router";
import { closeProgressDb } from "@/features/progress/progressStore";

const LEGACY_ACCENT =
  /\b(?:text|border|bg)-accent(?!-foreground)\b|\baccent-accent\b/;
const source = (p: string) => readFileSync(`src/${p}`, "utf8");

afterEach(async () => {
  cleanup();
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("GuideCard reskin (R5)", () => {
  it("renders through shadcn Card + Badge and drops the legacy accent", () => {
    const src = source("app/routes/GuideCard.tsx");
    expect(src).toContain('from "@/components/ui/card"');
    expect(src).toContain('from "@/components/ui/badge"');
    expect(src).not.toMatch(LEGACY_ACCENT);
  });
});

describe("SettingsScreen reskin (R5)", () => {
  async function renderSettings() {
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/settings"] }),
    );
    render(<RouterProvider router={router} />);
    await screen.findByText("Progress backup");
  }

  it("uses shadcn Input for the RA fields and a Switch for editor mode", async () => {
    await renderSettings();
    expect(document.querySelector('[data-slot="input"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="switch"]')).not.toBeNull();
    expect(source("app/routes/SettingsScreen.tsx")).not.toMatch(LEGACY_ACCENT);
  });
});
