// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import * as Collapsible from "@/components/ui/collapsible";
import * as Dialog from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import * as ScrollArea from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import * as Sheet from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import * as Tooltip from "@/components/ui/tooltip";

afterEach(cleanup);

// F4: the core shadcn component set is present, exports usable components, and
// renders through the paper-aliased token layer (semantic classes only).
describe("core shadcn component set", () => {
  it("renders the simple primitives with their data-slot markers", () => {
    render(
      <Card>
        <CardContent>
          <Button>Go</Button>
          <Badge>New</Badge>
          <Checkbox aria-label="done" />
          <Switch aria-label="whole game" />
          <Label htmlFor="x">Label</Label>
          <Separator />
          <Skeleton className="h-4 w-4" />
        </CardContent>
      </Card>,
    );

    expect(screen.getByRole("button", { name: "Go" })).toBeTruthy();
    expect(screen.getByText("New")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "done" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "whole game" })).toBeTruthy();
    expect(document.querySelector('[data-slot="card"]')).toBeTruthy();
  });

  it("styles through semantic token utilities, not literal colors", () => {
    render(<Button>Primary</Button>);
    const cls = screen.getByRole("button", { name: "Primary" }).className;
    expect(cls).toContain("bg-primary");
    expect(cls).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it("exports the overlay/composite components", () => {
    for (const root of [
      Dialog.Dialog,
      Sheet.Sheet,
      Collapsible.Collapsible,
      ScrollArea.ScrollArea,
      Tooltip.Tooltip,
    ]) {
      expect(root).toBeDefined();
    }
  });
});
