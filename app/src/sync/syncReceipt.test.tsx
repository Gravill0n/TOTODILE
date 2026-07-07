// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SyncReceipt } from "@/sync/SyncReceipt";
import type { SyncOutcome } from "@/sync/syncGuide";

const LEGACY_ACCENT =
  /\b(?:text|border|bg)-accent(?!-foreground)\b|\baccent-accent\b/;

const okOutcome: SyncOutcome = {
  status: "ok",
  receipt: { newlyMarked: 1, alreadyDone: 2, unmapped: 3 },
};

afterEach(cleanup);

describe("SyncReceipt reskin (R7)", () => {
  it("renders the three buckets as Badges and a lucide dismiss button", () => {
    const { container } = render(
      <SyncReceipt outcome={okOutcome} onDismiss={() => {}} />,
    );
    expect(container.querySelectorAll('[data-slot="badge"]').length).toBe(3);
    expect(screen.getByText(/1 newly marked/)).toBeTruthy();
    expect(screen.getByText(/3 unmapped/)).toBeTruthy();
    const dismiss = screen.getByLabelText("Dismiss");
    expect(dismiss.querySelector("svg")).not.toBeNull();
  });

  it("drops the legacy accent utility", () => {
    expect(readFileSync("src/sync/SyncReceipt.tsx", "utf8")).not.toMatch(
      LEGACY_ACCENT,
    );
  });
});
