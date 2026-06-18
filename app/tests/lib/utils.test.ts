import { describe, expect, it } from "vitest";
// Imported via the `@` alias on purpose: this test doubles as the smoke check
// that `@/...` resolves under vitest (F1 acceptance).
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("merges conflicting tailwind utilities, last wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
