// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeProgressDb,
  emptySlot,
  readAllSlots,
  writeSlot,
} from "@/features/progress/progressStore";
import { setCredentials } from "@/features/sync/raCredentials";
import { progressExport, SCHEMA_VERSION } from "@/schema";

afterEach(async () => {
  localStorage.clear();
  await closeProgressDb();
  await deleteDB("totodile");
});

describe("RA key isolation (§17.4)", () => {
  it("never serializes the key into a progress export", async () => {
    setCredentials({ username: "Pierre", webApiKey: "SUPER-SECRET-KEY" });
    await writeSlot(emptySlot("fictional-quest"));

    // Same payload the Settings export builds (FR-B6).
    const payload = progressExport.parse({
      kind: "totodile-progress",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      slots: await readAllSlots(),
    });

    expect(JSON.stringify(payload)).not.toContain("SUPER-SECRET-KEY");
  });
});
