// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearCredentials,
  getCredentials,
  hasCredentials,
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
    expect(hasCredentials()).toBe(true);
  });

  it("treats an empty username or key as no credentials", () => {
    setCredentials({ username: "Pierre", webApiKey: "" });
    expect(getCredentials()).toBeNull();
    expect(hasCredentials()).toBe(false);
  });

  it("clears stored credentials", () => {
    setCredentials({ username: "Pierre", webApiKey: "KEY-123" });
    clearCredentials();
    expect(getCredentials()).toBeNull();
  });
});
