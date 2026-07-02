import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
// dismissed. Kept as a status/alert toast (not a modal Dialog): it must not
// trap focus and the success case self-dismisses.
export function SyncReceipt({ outcome, onDismiss }: SyncReceiptProps) {
  const isError = outcome.status === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border px-4 py-2 text-sm shadow lg:bottom-4",
        isError
          ? "border-missable bg-paper-dim text-missable"
          : "border-line bg-card text-ink",
      )}
    >
      {outcome.status === "ok" ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-ink-soft">Synced</span>
          <Badge>{outcome.receipt.newlyMarked} newly marked</Badge>
          <Badge variant="secondary">
            {outcome.receipt.alreadyDone} already done
          </Badge>
          <Badge variant="outline" className="text-ink-soft">
            {outcome.receipt.unmapped} unmapped
          </Badge>
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
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-ink-soft"
      >
        <X />
      </Button>
    </div>
  );
}
