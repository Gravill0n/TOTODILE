import { useEffect, useState } from "react";

// Is the observed element on screen? Used to decide whether the page needs to
// offer a way back to a row it is already showing.
//
// The default — and the answer when `IntersectionObserver` does not exist — is
// **in view**. This drives a fallback affordance, so its absence must never be
// what puts a redundant control on the page: jsdom has no observer, and neither
// would a browser old enough to lack it. Defaulting the other way would pin a
// permanent "Back to NOW" button beside a perfectly visible NOW row.
//
// The ref is a state setter rather than a `useRef`, so attaching the element
// re-renders and starts the observation; the observer is released with it.
export function useInView<T extends Element>() {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (node === null || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      setInView(entries[entries.length - 1]?.isIntersecting ?? true);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref: setNode, inView };
}
