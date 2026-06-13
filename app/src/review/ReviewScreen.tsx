import { Link } from "@tanstack/react-router";
import type { ApprovalsFile, LayerRecord, LibraryEntry } from "../schema";

type ReviewScreenProps = {
  entry: LibraryEntry;
  approvals: ApprovalsFile | null;
};

const STATUS_LABEL: Record<LayerRecord["status"], string> = {
  draft: "Unreviewed",
  approved: "Approved",
  rejected: "Rejected",
};

// FR-E1 — unapproved layers must read as visually distinct from approved
// content. Approved layers sit calm; draft/rejected layers carry the missable
// accent so the eye lands on what still needs review.
function LayerCard({ layer }: { layer: LayerRecord }) {
  const approved = layer.status === "approved";
  return (
    <li
      className={`rounded-lg border p-4 ${
        approved ? "border-line bg-card" : "border-missable bg-paper-dim"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold">{layer.id}</h3>
        <span
          className={`rounded px-2 py-0.5 text-xs uppercase ${
            approved ? "text-ink-soft" : "font-bold text-missable"
          }`}
        >
          {STATUS_LABEL[layer.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {layer.kind} · {layer.report.rowCount} row(s) ·{" "}
        {layer.report.flaggedItemIds.length} flagged ·{" "}
        {layer.report.anomalies.length} anomaly(ies)
      </p>
      {layer.report.anomalies.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm text-ink-soft">
          {layer.report.anomalies.map((anomaly) => (
            <li key={anomaly}>{anomaly}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

// S5 — the review lens (desktop-first), editor mode only. Task 1 ships the
// report-card shell; flagged-row source excerpts (Task 2), random spot-checks
// (Task 3), and approve/reject (Task 4, the only writer of approvals.json) slot
// in here later.
export function ReviewScreen({ entry, approvals }: ReviewScreenProps) {
  const layers = approvals?.layers ?? [];
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <p className="text-xs uppercase text-missable">
          Review lens — unfinished
        </p>
        <h1 className="text-2xl font-bold">{entry.title}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A guide becomes playable only once every layer is approved (FR-E5).
        </p>
      </header>
      {layers.length === 0 ? (
        <p className="text-ink-soft">
          No compiled layers recorded yet — run the compiler passes, then review
          them here.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {layers.map((layer) => (
            <LayerCard key={layer.id} layer={layer} />
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-ink-soft">
        Flagged-row review, spot-checks, and approve/reject arrive in the next
        review-lens tasks.
      </p>
      <p className="mt-8 text-sm">
        <Link to="/" className="underline">
          Back to the library
        </Link>
      </p>
    </main>
  );
}
