import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { createAppRouter } from "@/app/router";
import { SCHEMA_VERSION } from "@/schema";
import { readFixtureJson } from "./fixtureRepo";
import { validLayer, validLibrary, validRaMapping } from "./helpers";

// The play view is URL-addressable (design v2), so its tests drive the router
// rather than rendering a screen bare. One stub + one render helper, shared by
// every guide test, keeps that boilerplate in one place — and `src/testing/**`
// is exempt from the import-boundary and style guards for exactly this.

const fixtureGuide = readFixtureJson("guides/fictional-quest/guide.json");

type StubOptions = {
  /** The library manifest served at `library.json`. */
  library?: unknown;
  /**
   * Guide files by slug; every playable slug gets the fictional-quest fixture
   * unless named here. Pass `{}` to serve none — the mid-recompile state where
   * the review inputs are green but the compiled guide is gone.
   */
  guides?: Record<string, unknown>;
  /** RA mappings by slug; a slug mapped to `null` serves a 404. */
  raMappings?: Record<string, unknown | null>;
  /** Slugs that read as playable (approvals + QA report present). */
  playableSlugs?: string[];
};

// An all-approved approvals record makes a guide playable (FR-E5); the QA
// report is the pipeline-completion signal beside it.
function approvedApprovals(slug: string) {
  return {
    schemaVersion: SCHEMA_VERSION,
    guideId: slug,
    layers: [{ ...validLayer("approved"), id: "layer-spine" }],
  };
}

export function stubGuideContent({
  library = validLibrary(),
  raMappings = { "fictional-quest": validRaMapping() },
  playableSlugs = ["fictional-quest"],
  // Playability includes "guide.json is actually there" (2026-07-31), so the
  // one knob has to furnish the file too — otherwise `playableSlugs` would
  // name guides the app then reads as unfinished.
  guides = Object.fromEntries(
    playableSlugs.map((slug) => [slug, fixtureGuide]),
  ),
}: StubOptions = {}) {
  const calls: { url: string; method: string }[] = [];
  const notFound = () => new Response("not found", { status: 404 });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET" });
      if (url.endsWith("library.json")) return Response.json(library);

      const of = (pattern: RegExp) => url.match(pattern)?.[1] ?? null;

      const approvals = of(/guides\/([^/]+)\/approvals\.json$/);
      if (approvals !== null) {
        return playableSlugs.includes(approvals)
          ? Response.json(approvedApprovals(approvals))
          : notFound();
      }
      const qa = of(/guides\/([^/]+)\/layers\/qa\.report\.json$/);
      if (qa !== null) {
        return playableSlugs.includes(qa)
          ? new Response("{}", { status: 200 })
          : notFound();
      }
      const guide = of(/guides\/([^/]+)\/guide\.json$/);
      if (guide !== null && guides[guide] !== undefined) {
        return Response.json(guides[guide]);
      }
      const mapping = of(/guides\/([^/]+)\/ra-mapping\.json$/);
      if (mapping !== null && raMappings[mapping]) {
        return Response.json(raMappings[mapping]);
      }
      return notFound();
    }),
  );

  return {
    /**
     * How many times a URL ending in `suffix` was fetched with `method`.
     * Method-aware because playability HEAD-probes guide.json (a 1.6 MB file
     * for Crystal): the invariant worth guarding is that the *body* is read
     * once per guide, which a bare URL count would confuse with the probe.
     */
    count: (suffix: string, method = "GET") =>
      calls.filter(
        (call) => call.url.endsWith(suffix) && call.method === method,
      ).length,
  };
}

/** Renders the app at a path and hands back the router to assert the URL on. */
export function renderAppAt(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<RouterProvider router={router} />);
  return router;
}

/**
 * Renders one guide's play view. `path` is appended to `/guide/<slug>`, so
 * `renderGuideAt("fictional-quest")` lands on the index (which redirects to
 * the pointer's visit) and passing "/chapter/c1/visit/v-castle-gate-1" opens
 * that visit directly.
 */
export function renderGuideAt(slug: string, path = "") {
  return renderAppAt(`/guide/${slug}${path}`);
}
