import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  notFound,
  Outlet,
  type RouterHistory,
} from "@tanstack/react-router";
import { loadGuide } from "../spine/guideData";
import { GuideScreen } from "./GuideScreen";
import { LibraryScreen } from "./LibraryScreen";
import { loadLibrary } from "./libraryData";

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
  loader: () => loadLibrary(),
  component: function LibraryRouteComponent() {
    return <LibraryScreen library={libraryRoute.useLoaderData()} />;
  },
});

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide/$slug",
  loader: async ({ params }) => {
    const library = await loadLibrary();
    const entry = library.guides.find((g) => g.id === params.slug);
    if (!entry) throw notFound();
    const guide = await loadGuide(entry.id);
    return { entry, guide };
  },
  component: function GuideRouteComponent() {
    const { entry, guide } = guideRoute.useLoaderData();
    return <GuideScreen entry={entry} guide={guide} />;
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <p className="mt-2 text-sm text-ink-soft">
        RA username and API key arrive with Sync (Phase 4). The key lives in
        browser storage only — never in the repo (§5.2).
      </p>
      <p className="mt-4 text-sm">
        <Link to="/" className="underline">
          Back to the library
        </Link>
      </p>
    </main>
  ),
});

const routeTree = rootRoute.addChildren([
  libraryRoute,
  guideRoute,
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
