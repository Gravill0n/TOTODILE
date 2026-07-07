import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { SourceEntry } from "../schema";
import type { FlaggedRow } from "./flaggedRows";

type RowSourceColumnsProps = {
  row: FlaggedRow;
  sourceById: Map<string, SourceEntry>;
  // Small label over the row (e.g. a "flagged" eyebrow); colour set by caller.
  eyebrow?: ReactNode;
  eyebrowClassName?: string;
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
          className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline"
        >
          Open source
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}
    </li>
  );
}

// The row beside the source(s) it traces to (FR-E2/E3) — two columns inline,
// no modal (§7). Shared by the flagged worklist and the spot-check sampler.
export function RowSourceColumns({
  row,
  sourceById,
  eyebrow,
  eyebrowClassName,
}: RowSourceColumnsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        {eyebrow ? (
          <p
            className={`text-xs uppercase ${eyebrowClassName ?? "text-ink-soft"}`}
          >
            {eyebrow}
          </p>
        ) : null}
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
    </div>
  );
}
