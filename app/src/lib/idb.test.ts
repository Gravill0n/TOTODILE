import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { createLazyDb } from "@/lib/idb";

const NAME = "totodile-idb-helper-test";

const lazy = createLazyDb(NAME, 1, (database) => {
  database.createObjectStore("rows", { keyPath: "id" });
});

afterEach(async () => {
  await lazy.close();
  await deleteDB(NAME);
});

describe("createLazyDb", () => {
  it("opens once and reuses the same connection", async () => {
    const first = await lazy.db();
    const second = await lazy.db();
    expect(second).toBe(first);
  });

  it("runs the upgrade and persists writes across close/reopen", async () => {
    await (await lazy.db()).put("rows", { id: "a", value: 1 });
    await lazy.close();
    const row = await (await lazy.db()).get("rows", "a");
    expect(row).toEqual({ id: "a", value: 1 });
  });

  it("close is safe when nothing was opened", async () => {
    await lazy.close();
    await expect(lazy.close()).resolves.toBeUndefined();
  });
});
