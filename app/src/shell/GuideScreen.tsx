import { useEffect, useMemo, useRef, useState } from "react";
import type { ProgressSlice } from "../progress/progressSlice";
import { useGuideProgress } from "../progress/useGuideProgress";
import type { GuideFile, LibraryEntry } from "../schema";
import { ChapterSheet } from "../spine/ChapterSheet";
import {
  chapterDomId,
  chapterOf,
  guideAssetUrl,
  stepDomId,
} from "../spine/guideData";
import { NowScreen } from "../spine/NowScreen";
import { getCredentials } from "../sync/raCredentials";
import { SyncReceipt } from "../sync/SyncReceipt";
import { type SyncOutcome, syncGuide } from "../sync/syncGuide";
import { PostureLayout } from "./PostureLayout";
import { WidgetDeck, type WidgetHandlers } from "./WidgetDeck";
import { WidgetsSheet } from "./WidgetsSheet";

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

  // FR-A5: widgets auto-filter to the chapter the current step is in;
  // the whole-game toggle lifts the filter. Global widgets always show.
  const currentChapterId = chapterOf(guide, currentStepId)?.id;
  const visibleWidgets = useMemo(() => {
    const ordered = [...guide.widgets].sort(
      (a, b) => a.deckPosition - b.deckPosition,
    );
    if (wholeGame) return ordered;
    return ordered.filter(
      (widget) =>
        widget.scope.kind === "global" ||
        widget.scope.chapterId === currentChapterId,
    );
  }, [guide, wholeGame, currentChapterId]);

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

  // Browse posture: widgets alternate across the two side columns in deck
  // order (the §6.4 deck order is the contract; the split is presentation).
  const leftWidgets = visibleWidgets.filter((_, index) => index % 2 === 0);
  const rightWidgets = visibleWidgets.filter((_, index) => index % 2 === 1);
  const wholeGameToggle = (
    <label className="mb-3 flex items-center gap-1 text-xs text-ink-soft">
      <input
        type="checkbox"
        checked={wholeGame}
        onChange={(event) => setWholeGame(event.target.checked)}
        aria-label="Whole game"
      />
      Whole game
    </label>
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
          <>
            {wholeGameToggle}
            <WidgetDeck
              widgets={leftWidgets}
              progress={progressSlice}
              {...handlers}
            />
          </>
        ) : undefined
      }
      rightPanel={
        progress.ready && rightWidgets.length > 0 ? (
          <WidgetDeck
            widgets={rightWidgets}
            progress={progressSlice}
            {...handlers}
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
