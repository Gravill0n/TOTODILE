// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

afterEach(cleanup);

// F4, trimmed: only the assertions about OUR token layer survive. The old
// render-and-assert-it-rendered cases tested vendored shadcn/radix behaviour
// (data-slot markers, aria-expanded, breadcrumb roles, "the export exists"),
// which is the library's job, not this repo's. Existence of the component set
// is proven by the screens that import it; the literal-colour and dark:
// rules are covered repo-wide by styleGuards/themeTokens/accentRetired.
describe("core shadcn component set", () => {
  it("styles through semantic token utilities, not literal colors", () => {
    render(<Button>Primary</Button>);
    const cls = screen.getByRole("button", { name: "Primary" }).className;
    expect(cls).toContain("bg-primary");
    expect(cls).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it("renders a single-select toggle group without the accent", () => {
    render(
      <ToggleGroup type="single" defaultValue="all" aria-label="Status">
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="playable">Playable</ToggleGroupItem>
      </ToggleGroup>,
    );
    const all = screen.getByRole("radio", { name: "All" });
    expect(all.getAttribute("data-state")).toBe("on");
    // §9.1: the active segment reads as a filled surface, never the accent —
    // the accent is reserved for achievements and the current position.
    expect(all.className).not.toMatch(/\bbg-accent\b|\bbg-primary\b/);
  });
});
