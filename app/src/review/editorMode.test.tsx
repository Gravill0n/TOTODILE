// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  getEditorMode,
  setEditorMode,
  useEditorMode,
} from "@/review/editorMode";

afterEach(() => {
  cleanup();
  setEditorMode(false);
  localStorage.clear();
});

function Probe() {
  return <span>{useEditorMode() ? "on" : "off"}</span>;
}

describe("editor mode flag (§9.3)", () => {
  it("defaults off", () => {
    expect(getEditorMode()).toBe(false);
  });

  it("persists to localStorage and notifies subscribers live", () => {
    render(<Probe />);
    expect(screen.getByText("off")).toBeDefined();

    act(() => setEditorMode(true));
    expect(screen.getByText("on")).toBeDefined();
    expect(getEditorMode()).toBe(true);
    expect(localStorage.getItem("totodile.editorMode")).toBe("1");

    act(() => setEditorMode(false));
    expect(screen.getByText("off")).toBeDefined();
    expect(localStorage.getItem("totodile.editorMode")).toBeNull();
  });
});
