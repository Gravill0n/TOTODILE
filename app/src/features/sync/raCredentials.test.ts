// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearCredentials,
  getCredentials,
  setCredentials,
} from "@/features/sync/raCredentials";

afterEach(() => localStorage.clear());

describe("RA credentials store (§10.2/§17.4)", () => {
  it("round-trips username + key, trimming whitespace", () => {
    setCredentials({ username: "  Pierre  ", webApiKey: " KEY-123 " });
    expect(getCredentials()).toEqual({
      username: "Pierre",
      webApiKey: "KEY-123",
    });
  });

  it("treats an empty username or key as no credentials", () => {
    setCredentials({ username: "Pierre", webApiKey: "" });
    // `getCredentials` returning null IS "no credentials" — Sync and Settings
    // both branch on that, so there is no second predicate to keep in step.
    expect(getCredentials()).toBeNull();
  });

  it("clears stored credentials", () => {
    setCredentials({ username: "Pierre", webApiKey: "KEY-123" });
    clearCredentials();
    expect(getCredentials()).toBeNull();
  });
});
