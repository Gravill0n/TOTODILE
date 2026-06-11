import type { LibraryEntry } from "../schema";
import { PostureLayout } from "./PostureLayout";

type GuideScreenProps = {
  entry: LibraryEntry;
};

// S2 placeholder inside the real posture skeleton. Spine rendering and the
// current-step pointer replace the body in Phase 1 Task 2.
export function GuideScreen({ entry }: GuideScreenProps) {
  return (
    <PostureLayout>
      <h1 className="text-xl font-bold">{entry.title}</h1>
      {entry.status === "in-compilation" ? (
        <p className="mt-2 text-sm text-ink-soft">
          In compilation — this guide opens into the review lens once it exists
          (Phase 3).
        </p>
      ) : null}
      <p className="mt-4 text-ink-soft">
        Play view arrives with spine rendering (Phase 1 Task 2).
      </p>
    </PostureLayout>
  );
}
