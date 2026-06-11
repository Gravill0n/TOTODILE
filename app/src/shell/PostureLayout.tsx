import type { ReactNode } from "react";

type PostureLayoutProps = {
  children: ReactNode;
  onChapters?: () => void;
  onWhereAmI?: () => void;
};

// §7 S2 skeleton. Phone (play posture): single column with the bottom
// action bar. Desktop (browse posture): walkthrough column flanked by
// widget panel columns. 🧩 and 🔄 stay inert until the widget renderers
// (Task 3) and Sync (Phase 4) land.
export function PostureLayout({
  children,
  onChapters,
  onWhereAmI,
}: PostureLayoutProps) {
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pt-4 pb-20 lg:pb-4">
        <aside
          aria-label="Widget panel"
          className="hidden w-56 shrink-0 lg:block"
        />
        <main className="min-w-0 flex-1">{children}</main>
        <aside
          aria-label="Widget panel"
          className="hidden w-56 shrink-0 lg:block"
        />
      </div>
      <nav
        aria-label="Guide actions"
        className="fixed inset-x-0 bottom-0 flex justify-around border-t border-line bg-card py-2 lg:hidden"
      >
        <button
          type="button"
          className="px-4 py-1 disabled:opacity-40"
          title="Chapters"
          onClick={onChapters}
          disabled={!onChapters}
        >
          ☰
        </button>
        <button
          type="button"
          className="px-4 py-1 opacity-40"
          title="Widgets"
          disabled
        >
          🧩
        </button>
        <button
          type="button"
          className="px-4 py-1 disabled:opacity-40"
          title="Where am I"
          onClick={onWhereAmI}
          disabled={!onWhereAmI}
        >
          📍
        </button>
        <button
          type="button"
          className="px-4 py-1 opacity-40"
          title="Sync"
          disabled
        >
          🔄
        </button>
      </nav>
    </div>
  );
}
