import { describe, expect, it } from "vitest";
import { advancePointer } from "@/progress/pointer";

const spine = ["a", "b", "c", "d"];

describe("advancePointer (§6 pointer semantics)", () => {
  it("advances to the immediate next step when it is unchecked", () => {
    expect(advancePointer(spine, new Set(["a"]), "a")).toBe("b");
  });

  it("skips steps already checked out of order", () => {
    expect(advancePointer(spine, new Set(["a", "b", "c"]), "a")).toBe("d");
  });

  it("stays put when every later step is checked", () => {
    expect(advancePointer(spine, new Set(["a", "b", "c", "d"]), "a")).toBe("a");
  });

  it("stays put on the last step", () => {
    expect(advancePointer(spine, new Set(["d"]), "d")).toBe("d");
  });

  it("stays put when the step is not in the spine", () => {
    expect(advancePointer(spine, new Set(), "ghost")).toBe("ghost");
  });
});
