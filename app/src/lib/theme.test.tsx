// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyTheme,
  getTheme,
  resolveTheme,
  setTheme,
  useTheme,
} from "./theme";

// jsdom has no matchMedia (see src/testing/setup.ts) — the system half of
// `auto` only exists where a test puts it, which is also the honest shape of
// the fallback: no matchMedia, no system preference to honor.
type Listener = (event: MediaQueryListEvent) => void;

function stubSystemDark(matches: boolean): { flip: (to: boolean) => void } {
  const listeners = new Set<Listener>();
  let current = matches;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      get matches() {
        return current;
      },
      addEventListener: (_: string, listener: Listener) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) =>
        listeners.delete(listener),
    }),
  });
  return {
    flip: (to: boolean) => {
      current = to;
      for (const listener of listeners) {
        listener({ matches: to } as MediaQueryListEvent);
      }
    },
  };
}

function Probe() {
  return <span data-testid="choice">{useTheme()}</span>;
}

const stamped = () => document.documentElement.dataset.theme;

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  Reflect.deleteProperty(window, "matchMedia");
});

afterEach(cleanup);

describe("theme preference (§5.4)", () => {
  it("defaults to auto, and auto with no matchMedia resolves light", () => {
    expect(getTheme()).toBe("auto");
    expect(resolveTheme("auto")).toBe("light");
  });

  it("resolves auto through the system preference", () => {
    stubSystemDark(true);
    expect(resolveTheme("auto")).toBe("dark");
    stubSystemDark(false);
    expect(resolveTheme("auto")).toBe("light");
  });

  it("an explicit choice overrides the system either way", () => {
    stubSystemDark(true);
    expect(resolveTheme("light")).toBe("light");
    stubSystemDark(false);
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("stamps the resolved theme on <html> and persists the choice", () => {
    setTheme("dark");
    expect(stamped()).toBe("dark");
    expect(localStorage.getItem("totodile.theme")).toBe("dark");
    expect(getTheme()).toBe("dark");
  });

  it("auto is the absence of a stored choice, not a stored 'auto'", () => {
    setTheme("dark");
    setTheme("auto");
    expect(localStorage.getItem("totodile.theme")).toBeNull();
    expect(getTheme()).toBe("auto");
    expect(stamped()).toBe("light");
  });

  it("ignores a junk stored value rather than throwing into render", () => {
    localStorage.setItem("totodile.theme", "sepia");
    expect(getTheme()).toBe("auto");
  });

  it("re-renders readers when the choice changes", () => {
    render(<Probe />);
    expect(screen.getByTestId("choice").textContent).toBe("auto");
    act(() => setTheme("light"));
    expect(screen.getByTestId("choice").textContent).toBe("light");
  });

  it("follows the system live while on auto", () => {
    const system = stubSystemDark(false);
    // The boot stamp main.tsx makes; the listener below is what keeps it true.
    applyTheme();
    render(<Probe />);
    expect(stamped()).toBe("light");
    act(() => system.flip(true));
    expect(stamped()).toBe("dark");
  });

  it("does not follow the system once a choice is made", () => {
    const system = stubSystemDark(false);
    render(<Probe />);
    act(() => setTheme("light"));
    act(() => system.flip(true));
    expect(stamped()).toBe("light");
  });
});
