import type { ReactNode } from "react";

type PostureLayoutProps = {
  children: ReactNode;
};

// §7 S2 skeleton. Phone (play posture): single column with the bottom
// action bar. Desktop (browse posture): walkthrough column flanked by
// widget panel columns. The bar buttons and panels are inert placeholders
// until spine rendering and the widget renderers land (Tasks 2–3).
export function PostureLayout({ children }: PostureLayoutProps) {
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
        <button type="button" className="px-4 py-1" title="Chapters">
          ☰
        </button>
        <button type="button" className="px-4 py-1" title="Widgets">
          🧩
        </button>
        <button type="button" className="px-4 py-1" title="Where am I">
          📍
        </button>
        <button type="button" className="px-4 py-1" title="Sync">
          🔄
        </button>
      </nav>
    </div>
  );
}
