import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// What the library is filtered and ordered by. View state only — the library
// is a place you pass through, so none of this is persisted or addressable.
export type StatusFilter = "all" | "playable" | "planned";
export type SortKey = "activity" | "title" | "completion";

export type LibraryView = {
  search: string;
  status: StatusFilter;
  sort: SortKey;
};

export const defaultLibraryView: LibraryView = {
  search: "",
  status: "all",
  sort: "activity",
};

type LibraryToolbarProps = {
  view: LibraryView;
  onChange: (view: LibraryView) => void;
};

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "playable", label: "Playable" },
  { value: "planned", label: "Planned" },
];

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "title", label: "Title" },
  { value: "completion", label: "Completion" },
];

export function LibraryToolbar({ view, onChange }: LibraryToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Input
        type="search"
        value={view.search}
        onChange={(event) =>
          onChange({ ...view, search: event.currentTarget.value })
        }
        aria-label="Search guides"
        placeholder="Search guides"
        className="max-w-xs flex-1 bg-card"
      />
      {/* Radix clears a single-select group when its active item is tapped
          again; a segmented control has no empty state, so an empty value is
          ignored rather than written back. */}
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={view.status}
        onValueChange={(value) =>
          value ? onChange({ ...view, status: value as StatusFilter }) : null
        }
        aria-label="Status filter"
      >
        {statusOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {/* Status is self-describing (All / Playable / Planned); sort is not —
          "Title" beside "Playable" reads as another filter without a label
          in front of it. The prototype labels only this one. */}
      <span className="ms-auto flex items-center gap-2">
        <span className="text-[11px] tracking-eyebrow text-ink-soft uppercase">
          Sort
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={view.sort}
          onValueChange={(value) =>
            value ? onChange({ ...view, sort: value as SortKey }) : null
          }
          aria-label="Sort by"
        >
          {sortOptions.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </span>
    </div>
  );
}
