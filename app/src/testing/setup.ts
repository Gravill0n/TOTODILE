// Vitest setup, applied to every test file (vite.config.ts → test.setupFiles).
//
// Only browser APIs jsdom does not implement but a *library we depend on*
// requires. Anything the product itself needs is either handled in the product
// (useInView answers "in view" without IntersectionObserver, useIsWide answers
// "wide" without matchMedia) or stubbed by the test that cares — a global stub
// is a place for a real gap to hide.

if (typeof window !== "undefined") {
  // react-resizable-panels measures its group to convert percentages into
  // pixels. jsdom has no ResizeObserver, so without this every test that
  // renders the guide's three columns throws on mount. The stub never fires a
  // callback: jsdom reports zero-size boxes anyway, so an observation would
  // carry no information — layout assertions belong in a real browser.
  globalThis.ResizeObserver ??= class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
