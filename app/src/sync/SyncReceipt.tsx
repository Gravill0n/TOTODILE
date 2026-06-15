import { Link } from "@tanstack/react-router";
import type { SyncOutcome } from "./syncGuide";

type SyncReceiptProps = {
  outcome: SyncOutcome;
  onDismiss: () => void;
};

// §11.2 messages — actionable, and pointing at Settings when the key is the
// problem. The wire status never reaches here; only the domain reason.
const ERROR: Record<
  Extract<SyncOutcome, { status: "error" }>["reason"],
  { text: string; settings?: boolean }
> = {
  noCredentials: {
    text: "Add your RetroAchievements username and key in",
    settings: true,
  },
  auth: {
    text: "RetroAchievements rejected the key — check it in",
    settings: true,
  },
  rateLimit: {
    text: "RetroAchievements is rate-limiting — wait a moment and try again.",
  },
  network: {
    text: "Couldn't reach RetroAchievements — check your connection and retry.",
  },
};

// §7 — the Sync receipt toast above the bottom bar. Success reads its three
// buckets and is auto-dismissed by the caller's timer; an error stays until
// dismissed.
export function SyncReceipt({ outcome, onDismiss }: SyncReceiptProps) {
  const isError = outcome.status === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-md items-center justify-between gap-3 rounded border px-4 py-2 text-sm shadow lg:bottom-4 ${
        isError
          ? "border-missable bg-paper-dim text-missable"
          : "border-line bg-card text-ink"
      }`}
    >
      {outcome.status === "ok" ? (
        <span className="text-accent">
          Synced — {outcome.receipt.newlyMarked} newly marked ·{" "}
          {outcome.receipt.alreadyDone} already done ·{" "}
          {outcome.receipt.unmapped} unmapped
        </span>
      ) : (
        <span>
          {ERROR[outcome.reason].text}
          {ERROR[outcome.reason].settings ? (
            <>
              {" "}
              <Link to="/settings" className="underline">
                Settings
              </Link>
              .
            </>
          ) : null}
        </span>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 px-1 text-ink-soft"
      >
        ✕
      </button>
    </div>
  );
}
