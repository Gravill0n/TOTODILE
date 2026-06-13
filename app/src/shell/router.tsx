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
import { readAllSlots } from "../progress/progressStore";
import { isPlayable, loadApprovals } from "../review/approvalsData";
import { getEditorMode } from "../review/editorMode";
import { loadLayerRoster } from "../review/layerRoster";
import { ReviewScreen } from "../review/ReviewScreen";
import { loadRaMapping, loadSources } from "../review/reviewLoaders";
import { loadGuide } from "../spine/guideData";
import { CleanupScreen } from "./CleanupScreen";
import { GuideScreen } from "./GuideScreen";
import { LibraryScreen } from "./LibraryScreen";
import { loadLibrary } from "./libraryData";
import { SettingsScreen } from "./SettingsScreen";

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
  // Playability is derived from each guide's approvals.json (§10.2, FR-E5),
  // not the library-manifest status hint — the approval records are the truth.
  loader: async () => {
    const library = await loadLibrary();
    const playableEntries = await Promise.all(
      library.guides.map(
        async (guide) =>
          [guide.id, isPlayable(await loadApprovals(guide.id))] as const,
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

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide/$slug",
  loader: async ({ params }) => {
    const library = await loadLibrary();
    const entry = library.guides.find((g) => g.id === params.slug);
    if (!entry) throw notFound();
    // Nav map (§7): in-compilation guides open into review, not play.
    if (!isPlayable(await loadApprovals(entry.id))) {
      throw redirect({ to: "/review/$slug", params: { slug: entry.id } });
    }
    const guide = await loadGuide(entry.id);
    return { entry, guide };
  },
  component: function GuideRouteComponent() {
    const { entry, guide } = guideRoute.useLoaderData();
    return <GuideScreen entry={entry} guide={guide} />;
  },
});

const cleanupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide/$slug/cleanup",
  // S4 cleanup is a play-view sibling — same playable guard as the guide.
  loader: async ({ params }) => {
    const library = await loadLibrary();
    const entry = library.guides.find((g) => g.id === params.slug);
    if (!entry) throw notFound();
    if (!isPlayable(await loadApprovals(entry.id))) {
      throw redirect({ to: "/review/$slug", params: { slug: entry.id } });
    }
    const [guide, raMapping] = await Promise.all([
      loadGuide(entry.id),
      loadRaMapping(entry.id),
    ]);
    return { entry, guide, raMapping };
  },
  component: function CleanupRouteComponent() {
    const { entry, guide, raMapping } = cleanupRoute.useLoaderData();
    return <CleanupScreen entry={entry} guide={guide} raMapping={raMapping} />;
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
    const approvals = await loadApprovals(entry.id);
    if (isPlayable(approvals)) {
      throw redirect({ to: "/guide/$slug", params: { slug: entry.id } });
    }
    // The roster comes from the QA report (§ the lens reads reports, FR-E2);
    // row content + sources are only worth loading once there are layers.
    const roster = await loadLayerRoster(entry.id);
    const [guide, raMapping, sources] =
      roster.length > 0
        ? await Promise.all([
            loadGuide(entry.id),
            loadRaMapping(entry.id),
            loadSources(entry.id),
          ])
        : [null, null, null];
    return { entry, approvals, roster, guide, raMapping, sources };
  },
  component: function ReviewRouteComponent() {
    const { entry, approvals, roster, guide, raMapping, sources } =
      reviewRoute.useLoaderData();
    return (
      <ReviewScreen
        entry={entry}
        approvals={approvals}
        roster={roster}
        guide={guide}
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
  guideRoute,
  cleanupRoute,
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
