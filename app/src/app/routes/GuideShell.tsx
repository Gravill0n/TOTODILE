import { useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGuideProgress } from "@/features/progress/useGuideProgress";
import { ChapterSheet } from "@/features/spine/ChapterSheet";
import { visitIndex } from "@/features/spine/chapterProgress";
import { MissableBanner } from "@/features/spine/MissableBanner";
import { upcomingMissables } from "@/features/spine/missables";
import { PostureLayout } from "@/features/spine/PostureLayout";
import { VisitScreen } from "@/features/spine/VisitScreen";
import type { WidgetHandlers } from "@/features/spine/WidgetDeck";
import { WidgetDialog } from "@/features/spine/WidgetDialog";
import { WidgetRail } from "@/features/spine/WidgetRail";
import { WidgetsSheet } from "@/features/spine/WidgetsSheet";
import { widgetContextFor, widgetInScope } from "@/features/spine/widgetScope";
import { getCredentials } from "@/features/sync/raCredentials";
import { SyncReceipt } from "@/features/sync/SyncReceipt";
import { type SyncOutcome, syncGuide } from "@/features/sync/syncGuide";
import { guideAssetUrl, stepDomId } from "@/lib/guide";
import { type GuideFile, idTail, type LibraryEntry } from "@/schema";
import type { ProgressSlice } from "@/types/progressSlice";

type GuideShellProps = {
  entry: LibraryEntry;
  guide: GuideFile;
  /** The fully-qualified id of the visit the URL points at. */
  visitId: string;
};

// "center" suits small targets (step rows). Whole chapters are taller than
// the viewport, and centering a too-tall element scrolls to its middle —
// chapter jumps must align to "start" to land on the heading.
function scrollToElement(
  domId: string,
  block: ScrollLogicalPosition = "center",
) {
  document.getElementById(domId)?.scrollIntoView?.({ block });
}

// S2 — the play view's chrome. Owns the progress slot and every affordance
// that outlives a single visit (header, sheets, sync, widget rails); the visit
// itself renders below from the URL, so this stays mounted while the player
// walks the route (§22.1 — the body is pure, the shell does the plumbing).
export function GuideShell({ entry, guide, visitId }: GuideShellProps) {
  const navigate = useNavigate();
  const progress = useGuideProgress(guide);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [wholeGame, setWholeGame] = useState(false);
  const [openWidgetId, setOpenWidgetId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [receipt, setReceipt] = useState<SyncOutcome | null>(null);

  const visits = useMemo(() => visitIndex(guide), [guide]);

  // Where the player is is an address, not component state: every jump between
  // visits goes through the URL so it can be copied, reloaded and walked back.
  const openVisit = useCallback(
    (targetVisitId: string) => {
      const target = visits.find((visit) => visit.visitId === targetVisitId);
      if (!target) return;
      void navigate({
        to: "/guide/$slug/chapter/$chapterId/visit/$visitId",
        params: {
          slug: entry.id,
          chapterId: idTail(target.chapterId),
          visitId: idTail(target.visitId),
        },
      });
    },
    [entry.id, navigate, visits],
  );

  // Jumping to a step is now two moves: open the visit that holds it, then
  // scroll to its row. The scroll cannot follow the navigate call directly —
  // the row does not exist until the new visit has rendered — so the target is
  // parked here and an effect below spends it once the row is in the DOM.
  const [pendingStepId, setPendingStepId] = useState<string | null>(null);
  const goToStep = useCallback(
    (stepId: string) => {
      const target = visits.find((visit) => visit.stepIds.includes(stepId));
      if (target && target.visitId !== visitId) openVisit(target.visitId);
      setPendingStepId(stepId);
    },
    [openVisit, visitId, visits],
  );

  useEffect(() => {
    if (pendingStepId === null) return;
    // The row is only in the DOM once its own visit is the displayed one, so
    // a target in another visit waits for the navigation to land.
    const holder = visits.find((visit) =>
      visit.stepIds.includes(pendingStepId),
    );
    if (holder && holder.visitId !== visitId) return;
    scrollToElement(stepDomId(pendingStepId));
    setPendingStepId(null);
  }, [pendingStepId, visitId, visits]);

  // FR-C: one tap fetches RA unlocks and additively marks mapped items, then
  // shows a receipt. Atomic — marks are written only on success (§8.1).
  const canSync = entry.raGameId !== undefined && progress.ready;
  const handleSync = async () => {
    if (entry.raGameId === undefined || !progress.ready) return;
    setSyncing(true);
    const outcome = await syncGuide({
      slug: entry.id,
      raGameId: entry.raGameId,
      credentials: getCredentials(),
      doneIds: progress.doneIds,
    });
    if (outcome.status === "ok") progress.markManyDone(outcome.toMark);
    setReceipt(outcome);
    setSyncing(false);
  };

  // §7 — a successful receipt dismisses itself; errors stay until tapped away.
  useEffect(() => {
    if (receipt?.status !== "ok") return;
    const timer = setTimeout(() => setReceipt(null), 6000);
    return () => clearTimeout(timer);
  }, [receipt]);

  const currentStepId = progress.ready ? progress.currentStepId : null;

  // FR-A5: widgets auto-filter to where the current step is — its chapter,
  // its location (across every visit there), or its specific visit; the
  // whole-game toggle lifts the filter. Global widgets always show.
  const widgetContext = useMemo(
    () => widgetContextFor(guide, currentStepId),
    [guide, currentStepId],
  );
  const visibleWidgets = useMemo(() => {
    const ordered = [...guide.widgets].sort(
      (a, b) => a.deckPosition - b.deckPosition,
    );
    if (wholeGame) return ordered;
    return ordered.filter((widget) =>
      widgetInScope(widget.scope, widgetContext),
    );
  }, [guide, wholeGame, widgetContext]);

  // FR-A4: opening the guide lands on the current step — once, not on every
  // pointer move. Scroll only, never navigate: the index route already chose
  // the visit, and a deep link is a deliberate destination that must not be
  // overruled by where the pointer happens to sit.
  const hasLandedRef = useRef(false);
  useEffect(() => {
    if (!hasLandedRef.current && currentStepId !== null) {
      hasLandedRef.current = true;
      setPendingStepId(currentStepId);
    }
  }, [currentStepId]);

  const progressSlice: ProgressSlice = {
    doneIds: progress.ready ? progress.doneIds : new Set(),
    counterValues: progress.ready ? progress.counterValues : {},
  };
  const handlers: WidgetHandlers = {
    onToggle: progress.ready ? progress.toggleDone : () => {},
    onAdjustCounter: progress.ready ? progress.adjustCounter : () => {},
    onResetCounter: progress.ready ? progress.resetCounter : () => {},
    resolveAsset: (path) => guideAssetUrl(entry.id, path),
  };

  // Browse posture: the side rails are launchers split by scope — global
  // widgets left, in-scope contextual ones right (§6.4 deck order holds
  // within each rail; the split is presentation). A launcher opens the
  // widget full-size in WidgetDialog. The open widget is looked up in the
  // full deck, not visibleWidgets, so it survives the pointer moving it
  // out of scope mid-interaction.
  const globalWidgets = visibleWidgets.filter(
    (widget) => widget.scope.kind === "global",
  );
  const contextWidgets = visibleWidgets.filter(
    (widget) => widget.scope.kind !== "global",
  );
  const openWidget =
    openWidgetId === null
      ? null
      : (guide.widgets.find((widget) => widget.id === openWidgetId) ?? null);
  // Whole-game only affects the contextual rail — global always shows.
  const wholeGameToggle = (
    <Label className="flex items-center gap-2 text-xs font-normal text-ink-soft">
      <Switch
        checked={wholeGame}
        onCheckedChange={setWholeGame}
        aria-label="Whole game"
      />
      Whole game
    </Label>
  );

  return (
    <PostureLayout
      onChapters={() => setChaptersOpen(true)}
      onWidgets={
        guide.widgets.length > 0 ? () => setWidgetsOpen(true) : undefined
      }
      onWhereAmI={
        currentStepId !== null ? () => goToStep(currentStepId) : undefined
      }
      onSync={canSync ? handleSync : undefined}
      syncing={syncing}
      leftPanel={
        progress.ready && guide.widgets.length > 0 ? (
          <WidgetRail
            widgets={globalWidgets}
            emptyLabel="No global widgets"
            onOpen={setOpenWidgetId}
          />
        ) : undefined
      }
      rightPanel={
        progress.ready && guide.widgets.length > 0 ? (
          <WidgetRail
            widgets={contextWidgets}
            header={wholeGameToggle}
            emptyLabel="Nothing in scope"
            onOpen={setOpenWidgetId}
          />
        ) : undefined
      }
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{entry.title}</h1>
        <span className="flex shrink-0 items-center gap-3">
          {/* The bottom action bar is phone-only (lg:hidden), so the browse
              posture carries its Sync affordance here — same handler, same
              in-flight disable. */}
          {canSync ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              aria-label="Sync with RetroAchievements"
              className="hidden lg:inline-flex"
            >
              <RefreshCw
                className={syncing ? "animate-spin" : undefined}
                aria-hidden
              />
              Sync
            </Button>
          ) : null}
          {/* Hash anchor, not <Link>: the app runs on hash history and this
              leaves the play view rather than moving within it. */}
          <a
            href={`#/guide/${entry.id}/cleanup`}
            className="text-sm text-ink-soft underline"
          >
            Cleanup
          </a>
        </span>
      </header>
      {progress.ready ? (
        <MissableBanner
          items={upcomingMissables(
            guide,
            progress.currentStepId,
            progress.doneIds,
            progress.acknowledgedMissableIds,
          )}
          onAcknowledge={progress.acknowledgeMissable}
          onJump={goToStep}
        />
      ) : null}
      {progress.ready ? (
        <VisitScreen
          guide={guide}
          slug={entry.id}
          visitId={visitId}
          currentStepId={progress.currentStepId}
          doneIds={progress.doneIds}
          skippedIds={progress.skippedIds}
          onToggleDone={progress.toggleDone}
          onToggleSkip={progress.toggleSkip}
          onMarkThrough={progress.markThrough}
          onMovePointer={progress.movePointer}
          onOpenVisit={openVisit}
        />
      ) : (
        <p className="text-ink-soft">Loading progress…</p>
      )}
      {chaptersOpen ? (
        <ChapterSheet
          chapters={guide.chapters}
          onJump={(chapterId) => {
            setChaptersOpen(false);
            // A chapter is not a page any more: it opens at its first visit.
            const first = visits.find((visit) => visit.chapterId === chapterId);
            if (first) openVisit(first.visitId);
          }}
          onClose={() => setChaptersOpen(false)}
        />
      ) : null}
      {openWidget !== null && progress.ready ? (
        <WidgetDialog
          widget={openWidget}
          progress={progressSlice}
          onClose={() => setOpenWidgetId(null)}
          {...handlers}
        />
      ) : null}
      {widgetsOpen && progress.ready ? (
        <WidgetsSheet
          widgets={visibleWidgets}
          progress={progressSlice}
          wholeGame={wholeGame}
          onWholeGameChange={setWholeGame}
          onClose={() => setWidgetsOpen(false)}
          {...handlers}
        />
      ) : null}
      {receipt ? (
        <SyncReceipt outcome={receipt} onDismiss={() => setReceipt(null)} />
      ) : null}
    </PostureLayout>
  );
}
