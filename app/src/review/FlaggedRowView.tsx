import type { SourceEntry } from "../schema";
import type { FlaggedRow } from "./flaggedRows";

type FlaggedRowViewProps = {
  row: FlaggedRow;
  sourceById: Map<string, SourceEntry>;
};

function SourceCard({ id, source }: { id: string; source?: SourceEntry }) {
  if (!source) {
    // A dangling sourceRef is a real fault — show it rather than hide it.
    return (
      <li className="rounded border border-missable p-2 text-missable">
        Unknown source “{id}”
      </li>
    );
  }
  return (
    <li className="rounded border border-line p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="rounded bg-paper-dim px-1 text-xs uppercase text-ink-soft">
          {source.type}
        </span>
        <span className="text-xs text-ink-soft">{source.retrievedAt}</span>
      </div>
      <p className="mt-1 text-sm">{source.title}</p>
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm text-accent underline"
        >
          Open source ↗
        </a>
      ) : null}
    </li>
  );
}

// FR-E2/E3 — the flagged row beside the source(s) it traces to, so the editor
// verifies without leaving the lens. Inline two columns (no modal, §7).
export function FlaggedRowView({ row, sourceById }: FlaggedRowViewProps) {
  return (
    <li className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-card p-3 sm:grid-cols-2">
      <div>
        <p className="text-xs uppercase text-missable">⚠ flagged</p>
        <p className="mt-1">{row.title}</p>
        {row.detail ? (
          <p className="mt-1 text-sm text-ink-soft">{row.detail}</p>
        ) : null}
      </div>
      <div>
        <p className="text-xs uppercase text-ink-soft">Source</p>
        {row.sourceRefs.length === 0 ? (
          <p className="mt-1 text-sm text-missable">No source on this row.</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {row.sourceRefs.map((id) => (
              <SourceCard key={id} id={id} source={sourceById.get(id)} />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
