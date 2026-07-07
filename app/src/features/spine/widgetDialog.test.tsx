// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetDialog } from "@/features/spine/WidgetDialog";
import { guideFile } from "@/schema";
import { readFixtureJson } from "@/testing/fixtureRepo";
import type { ProgressSlice } from "@/types/progressSlice";

const guide = guideFile.parse(
  readFixtureJson("guides/fictional-quest/guide.json"),
);
const checklist = guide.widgets.find((w) => w.type === "checklist");
if (!checklist) throw new Error("fixture guide has no checklist widget");

const emptyProgress: ProgressSlice = {
  doneIds: new Set(),
  counterValues: {},
};

const noopHandlers = {
  onToggle: () => {},
  onAdjustCounter: () => {},
  onResetCounter: () => {},
  resolveAsset: (p: string) => p,
};

afterEach(cleanup);

function renderDialog(
  overrides: Partial<Parameters<typeof WidgetDialog>[0]> = {},
) {
  render(
    <WidgetDialog
      widget={checklist as NonNullable<typeof checklist>}
      progress={emptyProgress}
      onClose={() => {}}
      {...noopHandlers}
      {...overrides}
    />,
  );
}

describe("WidgetDialog", () => {
  it("shows the widget title and body in a modal dialog", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(checklist.title)).toBeDefined();
    // The widget body is live, not a preview — first checklist row present.
    const firstRow = checklist.type === "checklist" ? checklist.rows[0] : null;
    expect(within(dialog).getByText(firstRow?.label ?? "")).toBeDefined();
  });

  it("forwards widget interactions to the handlers", () => {
    const onToggle = vi.fn();
    renderDialog({ onToggle });
    const firstRow = checklist.type === "checklist" ? checklist.rows[0] : null;
    fireEvent.click(screen.getByLabelText(firstRow?.label ?? ""));
    expect(onToggle).toHaveBeenCalledWith(firstRow?.itemId);
  });

  it("closes via the close button and via Escape", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
    const onEscape = vi.fn();
    renderDialog({ onClose: onEscape });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("opens wide and scrolls tall widgets under the pinned title", () => {
    renderDialog();
    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content?.className).toContain("sm:max-w-4xl");
    const body = content?.querySelector(".overflow-y-auto");
    expect(body).not.toBeNull();
    expect(body?.className).toContain("max-h-");
  });
});
