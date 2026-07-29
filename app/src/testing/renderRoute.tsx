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
  /** Guide files by slug; defaults to the fictional-quest fixture. */
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
  guides = { "fictional-quest": fixtureGuide },
  raMappings = { "fictional-quest": validRaMapping() },
  playableSlugs = ["fictional-quest"],
}: StubOptions = {}) {
  const calls: string[] = [];
  const notFound = () => new Response("not found", { status: 404 });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
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
    /** How many times a URL ending in `suffix` was requested. */
    count: (suffix: string) =>
      calls.filter((url) => url.endsWith(suffix)).length,
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
