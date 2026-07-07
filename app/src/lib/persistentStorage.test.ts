import { afterEach, describe, expect, it, vi } from "vitest";
import { requestPersistentStorage } from "@/lib/persistentStorage";

function stubNavigator(value: unknown): void {
  vi.stubGlobal("navigator", value);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestPersistentStorage", () => {
  it("returns true when the browser grants persistence", async () => {
    stubNavigator({ storage: { persist: () => Promise.resolve(true) } });
    await expect(requestPersistentStorage()).resolves.toBe(true);
  });

  it("returns false when the browser denies persistence", async () => {
    stubNavigator({ storage: { persist: () => Promise.resolve(false) } });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it("returns false when the Storage API is missing (§15 risk 8: best-effort)", async () => {
    stubNavigator({});
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it("returns false instead of throwing when the request rejects", async () => {
    stubNavigator({
      storage: { persist: () => Promise.reject(new Error("nope")) },
    });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});
