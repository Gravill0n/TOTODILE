// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { guideFile } from "@/schema";
import { WidgetRail } from "@/shell/WidgetRail";
import { readFixtureJson } from "@/testing/fixtureRepo";

const guide = guideFile.parse(
  readFixtureJson("guides/fictional-quest/guide.json"),
);

afterEach(cleanup);

describe("WidgetRail", () => {
  it("renders one launcher button per widget, named by its title", () => {
    render(
      <WidgetRail
        widgets={guide.widgets}
        emptyLabel="Empty"
        onOpen={() => {}}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(guide.widgets.length);
    for (const widget of guide.widgets) {
      const button = screen.getByRole("button", { name: widget.title });
      // A type icon, not the widget body — the rail is just a launcher.
      expect(button.querySelector("svg")).not.toBeNull();
    }
  });

  it("clicking a launcher reports the widget id", () => {
    const onOpen = vi.fn();
    render(
      <WidgetRail widgets={guide.widgets} emptyLabel="Empty" onOpen={onOpen} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Bestiary" }));
    expect(onOpen).toHaveBeenCalledWith("fictional-quest:bestiary");
  });

  it("renders the empty label and no buttons when nothing is in scope", () => {
    render(
      <WidgetRail
        widgets={[]}
        emptyLabel="Nothing in scope"
        onOpen={() => {}}
      />,
    );
    expect(screen.getByText("Nothing in scope")).toBeDefined();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders the header above the launcher list", () => {
    render(
      <WidgetRail
        widgets={guide.widgets}
        emptyLabel="Empty"
        header={<span>Rail header</span>}
        onOpen={() => {}}
      />,
    );
    const header = screen.getByText("Rail header");
    const firstButton = screen.getAllByRole("button")[0] as HTMLElement;
    // Header precedes the buttons in document order.
    expect(
      header.compareDocumentPosition(firstButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
