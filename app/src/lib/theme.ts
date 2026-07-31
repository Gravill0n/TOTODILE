import { useSyncExternalStore } from "react";

// §5.4 (amended 2026-07-31) — dark mode still honors the system preference,
// and can now be overridden either way. Three choices; `auto` is the default
// and what every existing install keeps.
//
// What is stored is the CHOICE; what the CSS reads is the RESOLVED theme,
// stamped on `<html data-theme>`. That is why the dark palette in index.css is
// one attribute-keyed block rather than a `prefers-color-scheme` media query:
// a media query cannot be overruled by a preference. index.html stamps the
// same attribute before first paint (no light flash on a dark-preference
// load); this module keeps it in step from then on.
//
// A single-user UI preference, so it lives in localStorage beside the
// editor-mode flag — never in the progress store, which is save data.

// Also spelled out in index.html's boot script — keep the two in sync.
const KEY = "totodile.theme";
const DARK = "(prefers-color-scheme: dark)";

export type Theme = "light" | "auto" | "dark";
export type ResolvedTheme = "light" | "dark";

const subscribers = new Set<() => void>();

function read(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    // Anything else — junk, a value from a future version, or nothing at all —
    // is `auto`. Storage that throws (private mode) lands here too.
    return stored === "light" || stored === "dark" ? stored : "auto";
  } catch {
    return "auto";
  }
}

function query(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  if (typeof window.matchMedia !== "function") return null;
  return window.matchMedia(DARK);
}

// No matchMedia (jsdom) → light: there is no system preference to honor, and
// light paper is what the app ships as. The mirror of useIsWide's fallback.
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "auto") return theme;
  return query()?.matches === true ? "dark" : "light";
}

// Stamp the resolved theme on <html>. index.html does this before first paint
// to avoid a flash; main.tsx calls it once at boot so the app owns the stamp
// from then on, and every change below re-stamps.
export function applyTheme(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolveTheme(read());
}

export function getTheme(): Theme {
  return read();
}

export function setTheme(value: Theme): void {
  try {
    // `auto` is the absence of a choice, not a stored word: a reader who never
    // touched this and one who chose auto are the same reader.
    if (value === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  } catch {
    // Best-effort persistence; the stamp and the notify below still land.
  }
  applyTheme();
  for (const notify of subscribers) notify();
}

// The system can change under an `auto` reader — a laptop switching at sunset —
// so the resolved stamp is refreshed on the media change, not only on ours.
// `apply` re-reads the choice, so this is a no-op for a reader who has picked
// a side.
function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  const list = query();
  const onSystemChange = () => {
    applyTheme();
    notify();
  };
  list?.addEventListener("change", onSystemChange);
  return () => {
    subscribers.delete(notify);
    list?.removeEventListener("change", onSystemChange);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, (): Theme => "auto");
}

// ponytail: the browser-chrome color (index.html's theme-color metas) still
// follows the system, so an overridden theme leaves the phone's status bar on
// the other palette. Swap the metas here if that ever reads as a bug.
