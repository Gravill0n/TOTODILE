import { useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGuideProgress } from "@/features/progress/useGuideProgress";
import { ChapterSheet } from "@/features/spine/ChapterSheet";
import { MissableBanner } from "@/features/spine/MissableBanner";
import { upcomingMissables } from "@/features/spine/missables";
import { NowScreen } from "@/features/spine/NowScreen";
import { PostureLayout } from "@/features/spine/PostureLayout";
import type { WidgetHandlers } from "@/features/spine/WidgetDeck";
import { WidgetDialog } from "@/features/spine/WidgetDialog";
import { WidgetRail } from "@/features/spine/WidgetRail";
import { WidgetsSheet } from "@/features/spine/WidgetsSheet";
import { widgetContextFor, widgetInScope } from "@/features/spine/widgetScope";
import { getCredentials } from "@/features/sync/raCredentials";
import { SyncReceipt } from "@/features/sync/SyncReceipt";
import { type SyncOutcome, syncGuide } from "@/features/sync/syncGuide";
import { chapterDomId, guideAssetUrl, stepDomId } from "@/lib/guide";
import type { ProgressSlice } from "@/types/progressSlice";
import type { GuideFile, LibraryEntry } from "../schema";

type GuideScreenProps = {
  entry: LibraryEntry;
  guide: GuideFile;
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

// S2 — the play view. Owns the progress slot and the navigation chrome;
// the spine and widgets render purely below (§22.1).
export function GuideScreen({ entry, guide }: GuideScreenProps) {
  const progress = useGuideProgress(guide);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [wholeGame, setWholeGame] = useState(false);
  const [openWidgetId, setOpenWidgetId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [receipt, setReceipt] = useState<SyncOutcome | null>(null);

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

  // FR-A4: opening the guide lands on the current step — once, not on
  // every pointer move.
  const hasLandedRef = useRef(false);
  useEffect(() => {
    if (!hasLandedRef.current && currentStepId !== null) {
      hasLandedRef.current = true;
      scrollToElement(stepDomId(currentStepId));
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
        currentStepId !== null
          ? () => scrollToElement(stepDomId(currentStepId))
          : undefined
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
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold">{entry.title}</h1>
        {/* Hash anchor, not <Link>: GuideScreen is rendered bare in tests, so
            it stays free of router context. The app runs on hash history. */}
        <a
          href={`#/guide/${entry.id}/cleanup`}
          className="shrink-0 text-sm text-ink-soft underline"
        >
          Cleanup
        </a>
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
          onJump={(stepId) => scrollToElement(stepDomId(stepId))}
        />
      ) : null}
      {progress.ready ? (
        <NowScreen
          guide={guide}
          slug={entry.id}
          currentStepId={progress.currentStepId}
          doneIds={progress.doneIds}
          skippedIds={progress.skippedIds}
          onToggleDone={progress.toggleDone}
          onToggleSkip={progress.toggleSkip}
          onMarkThrough={progress.markThrough}
          onMovePointer={progress.movePointer}
        />
      ) : (
        <p className="text-ink-soft">Loading progress…</p>
      )}
      {chaptersOpen ? (
        <ChapterSheet
          chapters={guide.chapters}
          onJump={(chapterId) => {
            setChaptersOpen(false);
            scrollToElement(chapterDomId(chapterId), "start");
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
