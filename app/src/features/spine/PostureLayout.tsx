import { MapPin, Menu, Puzzle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
  rightPanel?: ReactNode;
};

// The chrome — the header bar and both rails — sits on `card`; the column you
// actually read sits on `paper`. One tone apart is the whole trick: it says
// "this is the page, those are the tools" without a single border needing to
// shout. (Guide.dc.html: header and both columns `background:var(--color-card)`
// over a `--color-paper` page.)
const rail = "hidden overflow-y-auto border-line bg-card px-3 pt-4 pb-6";

// §7 S2 skeleton. Phone (play posture): one column that scrolls, with the
// bottom action bar. Desktop (browse posture): a full-bleed window that does
// NOT scroll — the header is pinned at the top and the three columns scroll
// independently underneath it, so the rails never slide away from the visit
// they describe. Widths are the prototype's: 248 / rest / 352.
export function PostureLayout({
  children,
  header,
  onChapters,
  onWidgets,
  onWhereAmI,
  onSync,
  syncing,
  leftPanel,
  rightPanel,
}: PostureLayoutProps) {
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
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[248px_minmax(0,1fr)_352px]">
        <aside aria-label="Chapters" className={`${rail} border-r lg:block`}>
          {leftPanel}
        </aside>
        <main className="min-w-0 px-4 pt-4 pb-20 lg:overflow-y-auto lg:px-8 lg:pb-12">
          {children}
        </main>
        <aside
          aria-label="Map and widgets"
          className={`${rail} min-h-0 border-l lg:flex lg:flex-col`}
        >
          {rightPanel}
        </aside>
      </div>
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
