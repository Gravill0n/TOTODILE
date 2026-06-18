import { MapPin, Menu, Puzzle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type PostureLayoutProps = {
  children: ReactNode;
  onChapters?: () => void;
  onWidgets?: () => void;
  onWhereAmI?: () => void;
  onSync?: () => void;
  syncing?: boolean;
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
};

// §7 S2 skeleton. Phone (play posture): single column with the bottom
// action bar. Desktop (browse posture): walkthrough column flanked by
// widget panel columns.
export function PostureLayout({
  children,
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
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pt-4 pb-20 lg:pb-4">
        <aside
          aria-label="Widget panel"
          className="hidden w-64 shrink-0 lg:block"
        >
          {leftPanel}
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        <aside
          aria-label="Widget panel"
          className="hidden w-64 shrink-0 lg:block"
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
          aria-label="Chapters"
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
