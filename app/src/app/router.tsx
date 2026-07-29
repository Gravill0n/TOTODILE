import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  notFound,
  Outlet,
  type RouterHistory,
  redirect,
} from "@tanstack/react-router";
import { readAllSlots, readSlot } from "@/features/progress/progressStore";
import {
  loadApprovals,
  loadPlayability,
} from "@/features/review/approvalsData";
import { getEditorMode } from "@/features/review/editorMode";
import { loadLayerRoster } from "@/features/review/layerRoster";
import { ReviewScreen } from "@/features/review/ReviewScreen";
import { loadReviewGuide } from "@/features/review/reviewContent";
import { loadDeck, loadSources } from "@/features/review/reviewLoaders";
import { visitIndex, visitOfStep } from "@/features/spine/chapterProgress";
import { buildLocationIndex } from "@/features/spine/locationIndex";
import { loadGuide } from "@/lib/content/guide";
import { loadLibrary } from "@/lib/content/library";
import { loadRaMapping } from "@/lib/content/raMapping";
import type { GuideFile, LibraryEntry, RaMapping } from "@/schema";
import { idTail, qualifyId } from "@/schema";
import { CleanupScreen } from "./routes/CleanupScreen";
import { GuideScreen } from "./routes/GuideScreen";
import { LibraryScreen } from "./routes/LibraryScreen";
import { LocationScreen } from "./routes/LocationScreen";
import { SettingsScreen } from "./routes/SettingsScreen";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-dvh bg-paper text-ink">
      <Outlet />
    </div>
  ),
  // Bugs and malformed data end here visibly — never a blank screen (§11.1).
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-xl font-bold text-missable">Something is broken</h1>
      <p className="mt-2 text-sm text-ink-soft">{error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-xl font-bold">Nothing here</h1>
      <p className="mt-2 text-sm">
        <Link to="/" className="underline">
          Back to the library
        </Link>
      </p>
    </main>
  ),
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  // Playability is derived from each guide's approvals.json + layers manifest
  // + QA completion (§10.2, FR-E5), not the library-manifest status hint —
  // the approval records are the truth.
  loader: async () => {
    const library = await loadLibrary();
    const playableEntries = await Promise.all(
      library.guides.map(
        async (guide) => [guide.id, await loadPlayability(guide.id)] as const,
      ),
    );
    return {
      library,
      slots: await readAllSlots(),
      playable: new Map(playableEntries),
    };
  },
  component: function LibraryRouteComponent() {
    const { library, slots, playable } = libraryRoute.useLoaderData();
    return (
      <LibraryScreen library={library} slots={slots} playable={playable} />
    );
  },
});

// The play view is a layout (§7): one entry lookup, one playability guard and
// one guide + ra-mapping fetch, shared by the visit, place and cleanup screens
// below. The guard lives in the loader rather than beforeLoad because
// beforeLoad re-runs on every navigation — walking visits would refetch
// approvals.json and library.json each time — while a loader is cached per
// match. `shouldReload: false` pins that cache: the guide file is read once
// per guide, not once per visit.
const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide/$slug",
  shouldReload: false,
  loader: async ({ params }) => {
    const library = await loadLibrary();
    const entry = library.guides.find((g) => g.id === params.slug);
    if (!entry) throw notFound();
    // Nav map (§7): in-compilation guides open into review, not play.
    if (!(await loadPlayability(entry.id))) {
      throw redirect({ to: "/review/$slug", params: { slug: entry.id } });
    }
    const [guide, raMapping] = await Promise.all([
      loadGuide(entry.id),
      // A guide with no RA set has no mapping to fetch (§6.5).
      entry.raGameId === undefined ? null : loadRaMapping(entry.id),
    ]);
    return { entry, guide, raMapping };
  },
  component: () => <Outlet />,
});

// Child loaders read the layout's data instead of re-fetching it. The parent
// match has always resolved by the time a child loader runs, so awaiting it
// costs nothing.
type GuideLayoutData = {
  entry: LibraryEntry;
  guide: GuideFile;
  raMapping: RaMapping | null;
};

async function guideLayoutData(
  parentMatchPromise: Promise<{ loaderData?: unknown }>,
): Promise<GuideLayoutData> {
  return (await parentMatchPromise).loaderData as GuideLayoutData;
}

// `#/guide/<slug>` is an address for "where I am", not a screen: it resolves
// the stored pointer to its visit and rewrites the URL there. `replace` keeps
// the redirect out of the history stack, so Back returns to the library.
const guideIndexRoute = createRoute({
  getParentRoute: () => guideRoute,
  path: "/",
  loader: async ({ params, parentMatchPromise }) => {
    const { guide } = await guideLayoutData(parentMatchPromise);
    const slot = await readSlot(params.slug);
    const target =
      visitOfStep(guide, slot.currentStepId) ?? visitIndex(guide)[0];
    if (!target) throw notFound();
    throw redirect({
      to: "/guide/$slug/chapter/$chapterId/visit/$visitId",
      params: {
        slug: params.slug,
        chapterId: idTail(target.chapterId),
        visitId: idTail(target.visitId),
      },
      replace: true,
    });
  },
});

// The visit page — the place *is* the page. Both params carry the guide-local
// tail of their ID; the chapter is part of the URL (not derivable noise) so
// the address reads as the route the player is walking.
const visitRoute = createRoute({
  getParentRoute: () => guideRoute,
  path: "chapter/$chapterId/visit/$visitId",
  loader: async ({ params, parentMatchPromise }) => {
    const { guide } = await guideLayoutData(parentMatchPromise);
    const chapter = guide.chapters.find(
      (c) => c.id === qualifyId(params.slug, params.chapterId),
    );
    const visit = chapter?.visits.find(
      (v) => v.id === qualifyId(params.slug, params.visitId),
    );
    // A visit under the wrong chapter is as wrong as one that does not exist:
    // a location reached twice has two URLs and they must not be confusable.
    if (!visit) throw notFound();
    return { visitId: visit.id };
  },
  component: function VisitRouteComponent() {
    const { entry, guide } = guideRoute.useLoaderData();
    return <GuideScreen entry={entry} guide={guide} />;
  },
});

const cleanupRoute = createRoute({
  getParentRoute: () => guideRoute,
  path: "cleanup",
  // S4 cleanup is a play-view sibling — the layout's guard and data cover it.
  component: function CleanupRouteComponent() {
    const { entry, guide, raMapping } = guideRoute.useLoaderData();
    return <CleanupScreen entry={entry} guide={guide} raMapping={raMapping} />;
  },
});

const placeRoute = createRoute({
  getParentRoute: () => guideRoute,
  path: "place/$loc",
  // The place screen (#8). `$loc` is the location ID's second segment; the
  // full ID is `<slug>:<loc>`.
  loader: async ({ params, parentMatchPromise }) => {
    const { guide } = await guideLayoutData(parentMatchPromise);
    const indexEntry = buildLocationIndex(guide).get(
      qualifyId(params.slug, params.loc),
    );
    if (!indexEntry) throw notFound();
    return { indexEntry };
  },
  component: function PlaceRouteComponent() {
    const { entry } = guideRoute.useLoaderData();
    const { indexEntry } = placeRoute.useLoaderData();
    return <LocationScreen entry={entry} indexEntry={indexEntry} />;
  },
});

const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/review/$slug",
  // The review lens is editor-mode only (§9.3) and only for unfinished guides
  // (§7 nav map). Player mode or an already-playable guide bounces away.
  loader: async ({ params }) => {
    if (!getEditorMode()) throw redirect({ to: "/" });
    const library = await loadLibrary();
    const entry = library.guides.find((g) => g.id === params.slug);
    if (!entry) throw notFound();
    const [approvals, playable] = await Promise.all([
      loadApprovals(entry.id),
      loadPlayability(entry.id),
    ]);
    if (playable) {
      throw redirect({ to: "/guide/$slug", params: { slug: entry.id } });
    }
    // The roster comes from the layers manifest (contract §2 rule 9);
    // row content + sources are only worth loading once there are layers.
    const roster = await loadLayerRoster(entry.id);
    const [guide, deck, raMapping, sources] =
      roster.length > 0
        ? await Promise.all([
            loadReviewGuide(entry.id, roster),
            loadDeck(entry.id),
            loadRaMapping(entry.id),
            loadSources(entry.id),
          ])
        : [null, null, null, null];
    return { entry, approvals, roster, guide, deck, raMapping, sources };
  },
  component: function ReviewRouteComponent() {
    const { entry, approvals, roster, guide, deck, raMapping, sources } =
      reviewRoute.useLoaderData();
    return (
      <ReviewScreen
        entry={entry}
        approvals={approvals}
        roster={roster}
        guide={guide}
        deck={deck}
        raMapping={raMapping}
        sources={sources}
      />
    );
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => <SettingsScreen />,
});

const routeTree = rootRoute.addChildren([
  libraryRoute,
  guideRoute.addChildren([
    guideIndexRoute,
    visitRoute,
    cleanupRoute,
    placeRoute,
  ]),
  reviewRoute,
  settingsRoute,
]);

// Hash history keeps every route reachable on any static host (§17.1, §19.1
// "static-host-safe") — no server rewrites, works under yarn preview and
// GitHub Pages alike. Tests pass a memory history instead.
export function createAppRouter(history: RouterHistory = createHashHistory()) {
  return createRouter({ routeTree, history });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
