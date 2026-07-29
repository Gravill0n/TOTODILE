import { Link, useNavigate } from "@tanstack/react-router";
import { RefreshCw, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useGuideProgress } from "@/features/progress/useGuideProgress";
import { useGuideUi } from "@/features/progress/useGuideUi";
import { ChapterRail } from "@/features/spine/ChapterRail";
import { ChapterSheet } from "@/features/spine/ChapterSheet";
import { chapterProgress, visitIndex } from "@/features/spine/chapterProgress";
import { MapPanel } from "@/features/spine/MapPanel";
import { upcomingMissables } from "@/features/spine/missables";
import { PostureLayout } from "@/features/spine/PostureLayout";
import { VisitScreen } from "@/features/spine/VisitScreen";
import { type WidgetHandlers, WidgetStack } from "@/features/spine/WidgetStack";
import { WidgetsSheet } from "@/features/spine/WidgetsSheet";
import { widgetContextFor, widgetInScope } from "@/features/spine/widgetScope";
import { getCredentials } from "@/features/sync/raCredentials";
import { SyncReceipt } from "@/features/sync/SyncReceipt";
import { type SyncOutcome, syncGuide } from "@/features/sync/syncGuide";
import { guideAssetUrl, guideStepIds, stepDomId } from "@/lib/guide";
import { mastery } from "@/lib/mastery";
import {
  type GuideFile,
  idTail,
  type LibraryEntry,
  type RaMapping,
  type WidgetScope,
} from "@/schema";
import type { ProgressSlice } from "@/types/progressSlice";

type GuideShellProps = {
  entry: LibraryEntry;
  guide: GuideFile;
  /** The guide's RA set, loaded once by the layout route; null when it has none. */
  raMapping: RaMapping | null;
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
export function GuideShell({
  entry,
  guide,
  raMapping,
  visitId,
}: GuideShellProps) {
  const navigate = useNavigate();
  const progress = useGuideProgress(guide);
  const ui = useGuideUi(guide.guideId);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [wholeGame, setWholeGame] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [receipt, setReceipt] = useState<SyncOutcome | null>(null);

  const visits = useMemo(() => visitIndex(guide), [guide]);
  const displayedLocation = useMemo(() => {
    const locationId = visits.find(
      (visit) => visit.visitId === visitId,
    )?.locationId;
    return guide.locations.find((location) => location.id === locationId);
  }, [guide, visitId, visits]);

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

  // Spine progress counts steps only: the done set also holds widget item ids
  // (§6.5 — one checkable namespace), and a ticked checklist row is not a step
  // walked. Mastery is the same proxy the library and cleanup screens use.
  const stepIds = useMemo(() => guideStepIds(guide), [guide]);
  const doneIds = progress.ready ? progress.doneIds : new Set<string>();
  const stepsDone = stepIds.filter((id) => doneIds.has(id)).length;
  const stepsTotal = stepIds.length;
  const achievements = mastery(raMapping, doneIds);

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

  // Scope labels read as prose ("Location · Sunken Vault") rather than ids.
  const nameForScope = useCallback(
    (scope: WidgetScope) => {
      if (scope.kind === "location") {
        return (
          guide.locations.find((l) => l.id === scope.locationId)?.name ?? ""
        );
      }
      if (scope.kind === "chapter") {
        return (
          guide.chapters.find((c) => c.id === scope.chapterId)?.title ?? ""
        );
      }
      if (scope.kind === "visit") {
        const visit = visits.find((v) => v.visitId === scope.visitId);
        return visit ? `${visit.locationName} ${visit.ordinalAtLocation}` : "";
      }
      return "";
    },
    [guide, visits],
  );

  // Whole-game lifts the scope filter; global widgets always show either way.
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
        progress.ready ? (
          <ChapterRail
            chapters={chapterProgress(guide, progress.doneIds)}
            slug={entry.id}
            visitId={visitId}
            onOpenVisit={openVisit}
          />
        ) : undefined
      }
      sizes={{
        leftRailPct: ui.leftRailPct,
        rightRailPct: ui.rightRailPct,
        mapPanePct: ui.mapPanePct,
      }}
      onSizesChange={ui.setRailLayout}
      mapPanel={
        // The map of the place the URL names — not the pointer's place. You
        // look at the map of the room you are reading about.
        progress.ready ? (
          <MapPanel
            locationName={displayedLocation?.name ?? ""}
            image={displayedLocation?.mapImage}
            resolveAsset={(path) => guideAssetUrl(entry.id, path)}
            view={{
              zoom: ui.mapZoom,
              panX: ui.mapPanX,
              panY: ui.mapPanY,
            }}
            onViewChange={ui.setMapView}
          />
        ) : undefined
      }
      widgetPanel={
        progress.ready && guide.widgets.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] tracking-eyebrow text-ink-soft uppercase">
                Widgets
              </span>
              {wholeGameToggle}
            </div>
            <WidgetStack
              widgets={visibleWidgets}
              progress={progressSlice}
              labelForScope={nameForScope}
              order={ui.widgetOrder}
              pinnedIds={ui.pinnedWidgetIds}
              onOrderChange={ui.setWidgetOrder}
              onTogglePin={ui.togglePinned}
              {...handlers}
            />
          </div>
        ) : undefined
      }
      header={
        <>
          {/* `←` rather than a lucide glyph: the DS icon set has no arrow-left,
              and the emoji guard allows this character by name. */}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-1.5 text-sm text-ink-soft"
          >
            <span aria-hidden className="text-base/none">
              ←
            </span>
            Library
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold">
            {entry.title}
          </h1>
          {/* The two totals a completionist tracks, without leaving the visit. */}
          <span className="hidden shrink-0 items-center gap-2.5 lg:flex">
            <Progress
              value={stepsTotal === 0 ? 0 : (stepsDone / stepsTotal) * 100}
              aria-label={`${entry.title} completion`}
              className="w-35"
            />
            <span className="font-mono text-sm font-medium text-primary tabular-nums">
              {`${stepsTotal === 0 ? 0 : Math.round((stepsDone / stepsTotal) * 100)}%`}
            </span>
            <span className="font-mono text-xs text-ink-soft tabular-nums">
              {`${stepsDone} / ${stepsTotal}`}
            </span>
            <span className="h-5 w-px bg-line" />
            <span className="flex items-center gap-1.5 font-mono text-xs text-ink-soft tabular-nums">
              <Trophy className="size-3.5 text-primary" aria-hidden />
              {achievements
                ? `${achievements.earned} / ${achievements.total}`
                : "no RA set"}
            </span>
          </span>
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
            className="shrink-0 text-sm text-ink-soft underline"
          >
            Cleanup
          </a>
        </>
      }
    >
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
          onBackToNow={() =>
            currentStepId === null ? undefined : goToStep(currentStepId)
          }
          // The lookahead is unchanged (FR-B5) — what changed is where the
          // warning lands: the ones falling inside this visit render at their
          // own step instead of stacking in a banner.
          missableStepIds={
            new Set(
              upcomingMissables(
                guide,
                progress.currentStepId,
                progress.doneIds,
                progress.acknowledgedMissableIds,
              ).map((item) => item.stepId),
            )
          }
          onAcknowledgeMissable={progress.acknowledgeMissable}
        />
      ) : (
        <p className="text-ink-soft">Loading progress…</p>
      )}
      {chaptersOpen && progress.ready ? (
        <ChapterSheet
          chapters={chapterProgress(guide, progress.doneIds)}
          slug={entry.id}
          visitId={visitId}
          onOpenVisit={(targetVisitId) => {
            setChaptersOpen(false);
            openVisit(targetVisitId);
          }}
          onClose={() => setChaptersOpen(false)}
        />
      ) : null}
      {widgetsOpen && progress.ready ? (
        <WidgetsSheet
          widgets={visibleWidgets}
          progress={progressSlice}
          labelForScope={nameForScope}
          order={ui.widgetOrder}
          pinnedIds={ui.pinnedWidgetIds}
          onOrderChange={ui.setWidgetOrder}
          onTogglePin={ui.togglePinned}
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
