import { useSyncExternalStore } from "react";

// §9.3 — the app's ONE feature flag. OFF = player mode stays clean (only
// playable guides, no review lens); ON = unapproved/in-progress guides and the
// review lens appear. A single-user UI preference, so it lives in localStorage,
// not the IndexedDB progress store (progress is the only thing that exports).
const KEY = "totodile.editorMode";

const subscribers = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Private-mode / disabled storage → default OFF, never throw into render.
    return false;
  }
}

export function getEditorMode(): boolean {
  return read();
}

export function setEditorMode(value: boolean): void {
  try {
    if (value) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Best-effort persistence; the in-memory notify below still updates the UI.
  }
  for (const notify of subscribers) notify();
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

// Reactive read — toggling in Settings re-renders the library live, no provider.
export function useEditorMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
