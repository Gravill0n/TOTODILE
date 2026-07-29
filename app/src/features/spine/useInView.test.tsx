// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInView } from "@/features/spine/useInView";

// This hook drives a *fallback* affordance — "Back to NOW" only exists because
// the row it points at is off screen. So the interesting case is the one jsdom
// gives us for free: no IntersectionObserver at all. Answering "not in view"
// there would put a permanent Back-to-NOW button next to a visible NOW row in
// every test in the suite, and on any browser without the API.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Probe() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="probe">
      {inView ? "in view" : "out of view"}
    </div>
  );
}

describe("useInView", () => {
  it("reports in view when IntersectionObserver is absent", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("in view");
  });

  it("follows the observer once it reports", () => {
    let notify: ((entries: { isIntersecting: boolean }[]) => void) | null =
      null;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(
          callback: (entries: { isIntersecting: boolean }[]) => void,
        ) {
          notify = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );

    const view = render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("in view");

    act(() => notify?.([{ isIntersecting: false }]));
    expect(screen.getByTestId("probe").textContent).toBe("out of view");

    act(() => notify?.([{ isIntersecting: true }]));
    expect(screen.getByTestId("probe").textContent).toBe("in view");

    // The observer is released with the element it was watching.
    view.unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
