import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// The decided-or-deciding half of a review card (FR-E4), shared by the
// per-layer card (spine, ra-mapping) and the slot-group card (widgets).
export type VerdictState = {
  status: "approved" | "rejected";
  note?: string | undefined;
};

type VerdictControlsProps = {
  // The current draft decision, if one exists — shows status + Change.
  verdict: VerdictState | undefined;
  // Names the unit being judged in the note's aria-label ("spine",
  // "Wild Encounters slot") and the note placeholder.
  subject: string;
  notePlaceholder?: string;
  onApprove: () => void;
  onReject: (note: string) => void;
  onClear: () => void;
};

const STATUS_LABEL = { approved: "Approved", rejected: "Rejected" } as const;

export function VerdictControls({
  verdict,
  subject,
  notePlaceholder = "rejection note (required — feeds the recompile)",
  onApprove,
  onReject,
  onClear,
}: VerdictControlsProps) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="mt-4 border-t border-line pt-3">
      {verdict ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={cn(
              "font-bold uppercase",
              verdict.status === "approved" ? "text-primary" : "text-missable",
            )}
          >
            {STATUS_LABEL[verdict.status]}
          </span>
          {verdict.note ? (
            <span className="text-ink-soft">“{verdict.note}”</span>
          ) : null}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-ink-soft"
            onClick={() => {
              onClear();
              setRejecting(false);
              setNote("");
            }}
          >
            Change
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={onApprove}>
            <Check aria-hidden />
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRejecting((value) => !value)}
          >
            <X aria-hidden />
            Reject
          </Button>
          {rejecting ? (
            <span className="flex flex-1 items-center gap-2">
              <Input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={notePlaceholder}
                aria-label={`Rejection note for ${subject}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!note.trim()}
                className="border-missable font-bold text-missable"
                onClick={() => {
                  onReject(note);
                  setRejecting(false);
                  setNote("");
                }}
              >
                Submit
              </Button>
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
