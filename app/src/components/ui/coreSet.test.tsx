// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import * as Accordion from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import * as Breadcrumb from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import * as Collapsible from "@/components/ui/collapsible";
import * as Dialog from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import * as ScrollArea from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import * as Sheet from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

  // Design v2 adds four primitives the screens were hand-rolling around: the
  // chapter rail is an accordion of progress bars, the visit page is headed by
  // a breadcrumb, and the library toolbar's status/sort filters are segmented
  // toggle groups.
  it("renders a progress bar with its value exposed", () => {
    render(<Progress value={42} aria-label="Completion" />);
    const bar = screen.getByRole("progressbar", { name: "Completion" });
    expect(bar.getAttribute("aria-valuenow")).toBe("42");
    expect(document.querySelector('[data-slot="progress"]')).toBeTruthy();
  });

  // The guide's columns are resizable (task 5.5.3), so the group, its panels
  // and the separator between them are part of the owned set now.
  it("renders a resizable group whose separator is reachable", () => {
    render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel id="left" defaultSize="30">
          left
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="right">right</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(
      document.querySelector('[data-slot="resizable-panel-group"]'),
    ).toBeTruthy();
    expect(
      document.querySelectorAll('[data-slot="resizable-panel"]'),
    ).toHaveLength(2);
    // The library gives the separator its own role, which is what makes the
    // keyboard path in task 5.5.3 possible.
    expect(screen.getByRole("separator")).toBeTruthy();
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

  it("renders an accordion whose trigger discloses its content", () => {
    render(
      <Accordion.Accordion type="single" collapsible defaultValue="c1">
        <Accordion.AccordionItem value="c1">
          <Accordion.AccordionTrigger>Chapter 01</Accordion.AccordionTrigger>
          <Accordion.AccordionContent>Kokiri Forest</Accordion.AccordionContent>
        </Accordion.AccordionItem>
      </Accordion.Accordion>,
    );
    const trigger = screen.getByRole("button", { name: "Chapter 01" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Kokiri Forest")).toBeTruthy();
  });

  it("renders a breadcrumb trail with the current page marked", () => {
    render(
      <Breadcrumb.Breadcrumb>
        <Breadcrumb.BreadcrumbList>
          <Breadcrumb.BreadcrumbItem>
            <Breadcrumb.BreadcrumbLink href="#/guide/g">
              Chapter 04
            </Breadcrumb.BreadcrumbLink>
          </Breadcrumb.BreadcrumbItem>
          <Breadcrumb.BreadcrumbSeparator />
          <Breadcrumb.BreadcrumbItem>
            <Breadcrumb.BreadcrumbPage>Visit 1</Breadcrumb.BreadcrumbPage>
          </Breadcrumb.BreadcrumbItem>
        </Breadcrumb.BreadcrumbList>
      </Breadcrumb.Breadcrumb>,
    );
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeTruthy();
    expect(screen.getByText("Visit 1").getAttribute("aria-current")).toBe(
      "page",
    );
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
