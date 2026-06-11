// Bootstrap smoke test — proves TS/JSX/Vitest wiring. Replaced by real
// schema tests in Phase 0 Task 2.
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("workspace bootstrap", () => {
  it("resolves the App component through the TS + JSX pipeline", () => {
    expect(typeof App).toBe("function");
  });
});
