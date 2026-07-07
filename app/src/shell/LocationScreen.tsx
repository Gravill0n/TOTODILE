import type { LocationIndexEntry } from "@/features/spine/locationIndex";
import { guideAssetUrl, stepHeadline } from "@/lib/guide";
import type { LibraryEntry } from "../schema";

type LocationScreenProps = {
  entry: LibraryEntry;
  indexEntry: LocationIndexEntry;
};

// The place-first screen (#8 / Workstream A): everything one location gathers
// across the whole route — its visits (with their steps), the widgets scoped to
// it, and the achievements earnable there — from the derived location index.
// A read-only overview; the play view is where things get ticked off.
export function LocationScreen({ entry, indexEntry }: LocationScreenProps) {
  const { location, visits, widgets, achievementRefs } = indexEntry;
  const count = (n: number, noun: string) =>
    `${n} ${noun}${n === 1 ? "" : "s"}`;
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <a
        href={`#/guide/${entry.id}`}
        className="text-sm text-ink-soft underline"
      >
        ← Back to {entry.title}
      </a>
      <h1 className="mt-2 text-2xl font-bold">{location.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {count(visits.length, "visit")} ·{" "}
        {count(achievementRefs.length, "achievement")} here
      </p>
      {location.mapImage ? (
        <img
          src={guideAssetUrl(entry.id, location.mapImage.src)}
          alt={location.mapImage.alt}
          className="mt-3 max-h-72 rounded border border-line"
        />
      ) : null}

      <section className="mt-6">
        <h2 className="border-b-2 border-line pb-1 text-lg font-bold">
          Visits
        </h2>
        {visits.map((visit, index) => (
          <div key={visit.id} className="mt-3">
            <h3 className="text-sm font-bold text-ink-soft">
              Visit {index + 1}
            </h3>
            <ul className="mt-1 space-y-1">
              {visit.steps.map((step) => (
                <li key={step.id} className="text-sm">
                  {stepHeadline(step)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {widgets.length > 0 ? (
        <section className="mt-6">
          <h2 className="border-b-2 border-line pb-1 text-lg font-bold">
            Reference
          </h2>
          <ul className="mt-2 space-y-1">
            {widgets.map((widget) => (
              <li key={widget.id} className="text-sm">
                {widget.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
