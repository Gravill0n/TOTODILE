import { useSyncExternalStore } from "react";

// `lg` in Tailwind's default scale — the app's one breakpoint (§7).
const WIDE = "(min-width: 64rem)";

function query(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  if (typeof window.matchMedia !== "function") return null;
  return window.matchMedia(WIDE);
}

function subscribe(notify: () => void): () => void {
  const list = query();
  if (list === null) return () => {};
  list.addEventListener("change", notify);
  return () => list.removeEventListener("change", notify);
}

// Is the browse posture on screen? Read in JS rather than CSS because the
// resizable panel group writes inline flex styles that a class cannot
// neutralise — the two postures have to be different trees, not one tree
// styled two ways.
//
// **Answers `true` when `matchMedia` is missing**, the same call `useInView`
// makes for `IntersectionObserver`: jsdom implements neither, and the browse
// posture is the richer one — every existing test asserts three columns, and
// a phone-shaped default would quietly hide all of them.
export function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? true,
    () => true,
  );
}
