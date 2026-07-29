import { MapPin, Menu, Puzzle, RefreshCw } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { useGroupRef } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsWide } from "./useIsWide";

// How the columns are divided, as percentages. The library's own unit: its
// Layout is a map of panel id to a number between 0 and 100.
export type RailSizes = {
  leftRailPct: number;
  rightRailPct: number;
  mapPanePct: number;
};

type PostureLayoutProps = {
  children: ReactNode;
  /** The guide bar. Spans every column and stays put while the visit scrolls. */
  header?: ReactNode;
  onChapters?: () => void;
  onWidgets?: () => void;
  onWhereAmI?: () => void;
  onSync?: () => void;
  syncing?: boolean;
  leftPanel?: ReactNode;
  /** Top of the right column — fixed height, does not scroll. */
  mapPanel?: ReactNode;
  /** Bottom of the right column — scrolls on its own. */
  widgetPanel?: ReactNode;
  sizes?: RailSizes;
  onSizesChange?: (sizes: Partial<RailSizes>) => void;
};

const DEFAULT_SIZES: RailSizes = {
  leftRailPct: 18,
  rightRailPct: 25,
  mapPanePct: 45,
};

// The chrome — the header bar and both rails — sits on `card`; the column you
// actually read sits on `paper`. One tone apart is the whole trick: it says
// "this is the page, those are the tools" without a single border needing to
// shout. (Guide.dc.html: header and both columns `background:var(--color-card)`
// over a `--color-paper` page.)
const railSurface = "h-full bg-card px-3 pt-4 pb-6";

// §7 S2 skeleton. Phone (play posture): one column that scrolls, with the
// bottom action bar. Desktop (browse posture): a full-bleed header over three
// columns that the reader sizes — where you are in the route on the left, the
// visit in the middle, the map and widgets for that place on the right — none
// of which scrolls the window, only itself.
//
// The two postures are different trees rather than one tree styled two ways:
// the panel group writes inline flex styles that a class cannot neutralise.
export function PostureLayout({
  children,
  header,
  onChapters,
  onWidgets,
  onWhereAmI,
  onSync,
  syncing,
  leftPanel,
  mapPanel,
  widgetPanel,
  sizes = DEFAULT_SIZES,
  onSizesChange,
}: PostureLayoutProps) {
  const isWide = useIsWide();
  const { leftRailPct, rightRailPct, mapPanePct } = sizes;

  // `defaultLayout` is read once, on mount. The sizes arrive later than that —
  // they are read from IndexedDB — so applying them needs the imperative
  // handle, or a reader's arrangement would silently lose to the defaults on
  // every load.
  const columnsRef = useGroupRef();
  const splitRef = useGroupRef();
  useEffect(() => {
    columnsRef.current?.setLayout({
      left: leftRailPct,
      visit: 100 - leftRailPct - rightRailPct,
      right: rightRailPct,
    });
  }, [columnsRef, leftRailPct, rightRailPct]);
  useEffect(() => {
    splitRef.current?.setLayout({
      map: mapPanePct,
      widgets: 100 - mapPanePct,
    });
  }, [splitRef, mapPanePct]);

  const visit = (
    <main className="min-w-0 px-4 pt-4 pb-20 lg:h-full lg:overflow-y-auto lg:px-8 lg:pb-12">
      {children}
    </main>
  );

  return (
    <div className="min-h-dvh lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      {header ? (
        // Sticky on phone (the page scrolls under it); on desktop the shell
        // itself never scrolls, so the bar simply holds its row.
        <header className="sticky top-0 z-30 border-b border-line bg-card lg:static lg:shrink-0">
          <div className="flex h-14 items-center gap-5 px-4 lg:px-6">
            {header}
          </div>
        </header>
      ) : null}

      {isWide ? (
        <ResizablePanelGroup
          orientation="horizontal"
          groupRef={columnsRef}
          className="min-h-0 flex-1"
          defaultLayout={{
            left: leftRailPct,
            visit: 100 - leftRailPct - rightRailPct,
            right: rightRailPct,
          }}
          // `onLayoutChanged` rather than `onLayoutChange`: the latter fires on
          // every pointer move, and every one of those would be a write.
          onLayoutChanged={(layout) =>
            onSizesChange?.({
              leftRailPct: layout.left ?? leftRailPct,
              rightRailPct: layout.right ?? rightRailPct,
            })
          }
        >
          <ResizablePanel id="left" minSize="8" maxSize="40">
            <aside
              aria-label="Chapters"
              className={`${railSurface} overflow-y-auto border-r border-line`}
            >
              {leftPanel}
            </aside>
          </ResizablePanel>
          <ResizableHandle />

          <ResizablePanel id="visit">{visit}</ResizablePanel>
          <ResizableHandle />

          <ResizablePanel id="right" minSize="12" maxSize="45">
            <aside
              aria-label="Map and widgets"
              className="h-full border-l border-line bg-card"
            >
              <ResizablePanelGroup
                orientation="vertical"
                groupRef={splitRef}
                defaultLayout={{ map: mapPanePct, widgets: 100 - mapPanePct }}
                onLayoutChanged={(layout) =>
                  onSizesChange?.({ mapPanePct: layout.map ?? mapPanePct })
                }
              >
                {/* The map holds still and the widget stack scrolls under it,
                    as in Guide.dc.html — and so a wheel over the map is
                    unambiguously a zoom, not a fight with a scrolling rail. */}
                <ResizablePanel id="map" minSize="15" maxSize="85">
                  <div className="h-full overflow-hidden px-3 pt-4">
                    {mapPanel}
                  </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel id="widgets">
                  <div className="h-full overflow-y-auto px-3 pt-3 pb-6">
                    {widgetPanel}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </aside>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        visit
      )}

      <nav
        aria-label="Guide actions"
        className="fixed inset-x-0 bottom-0 flex justify-around border-t border-line bg-card py-2 lg:hidden"
      >
        <Button
          variant="ghost"
          size="icon"
          title="Chapters"
          // The desktop rail *is* the chapter list and owns that name; this
          // button opens the same list as a sheet.
          aria-label="Open chapter list"
          onClick={onChapters}
          disabled={!onChapters}
        >
          <Menu />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Widgets"
          aria-label="Widgets"
          onClick={onWidgets}
          disabled={!onWidgets}
        >
          <Puzzle />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Where am I"
          aria-label="Where am I"
          onClick={onWhereAmI}
          disabled={!onWhereAmI}
        >
          <MapPin />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={syncing ? "Syncing…" : "Sync"}
          aria-label={syncing ? "Syncing…" : "Sync"}
          onClick={onSync}
          disabled={!onSync || syncing}
        >
          <RefreshCw className={syncing ? "animate-spin" : undefined} />
        </Button>
      </nav>
    </div>
  );
}
