import { describe, expect, it } from "vitest";
import {
  type CleanupProgress,
  collectCleanupTasks,
  mastery,
} from "@/app/routes/cleanupTasks";
import { guideFile, raMapping as raMappingSchema } from "@/schema";
import { validGuide, validRaMapping } from "@/testing/helpers";

const guide = guideFile.parse(validGuide());

function progress(over: Partial<CleanupProgress> = {}): CleanupProgress {
  return {
    doneIds: new Set(),
    skippedIds: new Set(),
    counterValues: {},
    ...over,
  };
}

function allItems(groups: ReturnType<typeof collectCleanupTasks>) {
  return groups.flatMap((g) => g.items);
}

describe("collectCleanupTasks (FR-B4)", () => {
  it("groups non-done steps by location, in chapter order", () => {
    const groups = collectCleanupTasks(guide, progress());
    expect(groups[0]?.label).toBe("Castle Gate");
    expect(groups[0]?.items.map((i) => i.itemId)).toEqual([
      "fictional-quest:c1:s1",
      "fictional-quest:c1:s2",
    ]);
  });

  it("excludes done items and flags skipped ones", () => {
    const groups = collectCleanupTasks(
      guide,
      progress({
        doneIds: new Set(["fictional-quest:c1:s1"]),
        skippedIds: new Set(["fictional-quest:c1:s2"]),
      }),
    );
    const castle = groups.find((g) => g.label === "Castle Gate");
    expect(castle?.items.map((i) => i.itemId)).toEqual([
      "fictional-quest:c1:s2",
    ]);
    expect(castle?.items[0]?.skipped).toBe(true);
  });

  it("skips non-checkable dataTable rows but keeps real widget tasks", () => {
    const ids = allItems(collectCleanupTasks(guide, progress())).map(
      (i) => i.itemId,
    );
    expect(ids).toContain("fictional-quest:w1:r1"); // checklist row
    expect(ids).toContain("fictional-quest:w2:hero-fire"); // matrix cell
    expect(ids).not.toContain("fictional-quest:w3:sentry"); // dataTable, checkable:false
  });

  it("includes a counter below target and drops it once reached", () => {
    const below = allItems(collectCleanupTasks(guide, progress())).find(
      (i) => i.itemId === "fictional-quest:w4:coins",
    );
    expect(below?.kind).toBe("counter");
    expect(below?.counter).toEqual({ value: 0, target: 40 });

    const reached = allItems(
      collectCleanupTasks(
        guide,
        progress({ counterValues: { "fictional-quest:w4:coins": 40 } }),
      ),
    ).find((i) => i.itemId === "fictional-quest:w4:coins");
    expect(reached).toBeUndefined();
  });

  it("derives a derived counter's value from doneIds, never counterValues (#5)", () => {
    const derivedGuide = guideFile.parse({
      ...validGuide(),
      widgets: validGuide().widgets.map((w) =>
        w.id === "fictional-quest:w4"
          ? {
              ...w,
              counters: [
                {
                  itemId: "fictional-quest:w4:coins",
                  label: "Blue coins",
                  derivedFrom: [
                    "fictional-quest:c1:s1",
                    "fictional-quest:c1:s2",
                  ],
                  sourceRefs: ["src-wiki"],
                  confidence: "normal",
                },
              ],
            }
          : w,
      ),
    });
    const item = allItems(
      collectCleanupTasks(
        derivedGuide,
        progress({
          doneIds: new Set(["fictional-quest:c1:s1"]),
          // A stray stored value must be ignored for derived entries.
          counterValues: { "fictional-quest:w4:coins": 99 },
        }),
      ),
    ).find((i) => i.itemId === "fictional-quest:w4:coins");
    expect(item?.counter).toEqual({ value: 1, target: 2 });
  });
});

describe("mastery (§7 S4)", () => {
  it("counts an achievement earned when its mapped target is done", () => {
    const map = raMappingSchema.parse(validRaMapping());
    expect(mastery(map, new Set(["fictional-quest:c1:s1"]))).toEqual({
      earned: 1,
      total: 2,
    });
  });

  it("is null without an RA mapping", () => {
    expect(mastery(null, new Set())).toBeNull();
  });
});
