import { useEffect, useRef, useState } from "react";
import { useGuideProgress } from "../progress/useGuideProgress";
import type { GuideFile, LibraryEntry } from "../schema";
import { ChapterSheet } from "../spine/ChapterSheet";
import { chapterDomId, stepDomId } from "../spine/guideData";
import { NowScreen } from "../spine/NowScreen";
import { PostureLayout } from "./PostureLayout";

type GuideScreenProps = {
  entry: LibraryEntry;
  guide: GuideFile;
};

function scrollToElement(domId: string) {
  document.getElementById(domId)?.scrollIntoView?.({ block: "center" });
}

// S2 — the play view. Owns the progress slot and the navigation chrome;
// the spine itself renders purely below (§22.1).
export function GuideScreen({ entry, guide }: GuideScreenProps) {
  const progress = useGuideProgress(guide);
  const [chaptersOpen, setChaptersOpen] = useState(false);

  const currentStepId = progress.ready ? progress.currentStepId : null;

  // FR-A4: opening the guide lands on the current step — once, not on
  // every pointer move.
  const hasLandedRef = useRef(false);
  useEffect(() => {
    if (!hasLandedRef.current && currentStepId !== null) {
      hasLandedRef.current = true;
      scrollToElement(stepDomId(currentStepId));
    }
  }, [currentStepId]);

  return (
    <PostureLayout
      onChapters={() => setChaptersOpen(true)}
      onWhereAmI={
        currentStepId !== null
          ? () => scrollToElement(stepDomId(currentStepId))
          : undefined
      }
    >
      <header className="mb-4">
        <h1 className="text-xl font-bold">{entry.title}</h1>
        {entry.status === "in-compilation" ? (
          <p className="mt-1 text-xs text-ink-soft">
            In compilation — opens into the review lens once it exists (Phase
            3).
          </p>
        ) : null}
      </header>
      {progress.ready ? (
        <NowScreen
          guide={guide}
          slug={entry.id}
          currentStepId={progress.currentStepId}
          doneIds={progress.doneIds}
          onToggleDone={progress.toggleDone}
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
            scrollToElement(chapterDomId(chapterId));
          }}
          onClose={() => setChaptersOpen(false)}
        />
      ) : null}
    </PostureLayout>
  );
}
