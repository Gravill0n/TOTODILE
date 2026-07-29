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

// The chrome — the header bar and both rails — sits on paper-dim; the column
// you actually read sits on paper. One tone apart is the whole trick: it says
// "this is the page, those are the tools" without a single border needing to
// shout.
const rail =
  "hidden shrink-0 bg-paper-dim px-3 py-4 lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:overflow-y-auto";

// §7 S2 skeleton. Phone (play posture): single column with the bottom action
// bar. Desktop (browse posture): a full-bleed header over three columns —
// where you are in the route on the left, the visit in the middle, the map and
// widgets for that place on the right. Nothing is centred in a fixed measure:
// the rails hold the edges of the window and the visit takes what is left.
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
    <div className="min-h-dvh">
      {header ? (
        <header className="sticky top-0 z-30 border-b border-line bg-paper-dim">
          <div className="flex h-14 items-center gap-3 px-4">{header}</div>
        </header>
      ) : null}
      <div className="flex">
        {/* Sticky rails (#3): full viewport height under the header, so each
            reads as a column rather than a floating panel, with an internal
            scroll for the long ones. */}
        <aside
          aria-label="Chapters"
          className={`${rail} w-72 border-r border-line`}
        >
          {leftPanel}
        </aside>
        <main className="min-w-0 flex-1 px-6 pt-4 pb-20 lg:pb-8">
          {children}
        </main>
        <aside
          aria-label="Map and widgets"
          className={`${rail} w-80 border-l border-line`}
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
