import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// F2: components.json must let `shadcn add` target this app correctly —
// new-york style, CSS variables, lucide icons, our index.css, and the `@`
// aliases F1 wired.
const config = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../components.json", import.meta.url)),
    "utf8",
  ),
);

describe("components.json", () => {
  it("uses the new-york style with CSS variables", () => {
    expect(config.style).toBe("new-york");
    expect(config.tailwind.cssVariables).toBe(true);
  });

  it("points shadcn at our Tailwind v4 entry stylesheet", () => {
    expect(config.tailwind.css).toBe("src/index.css");
    // Tailwind v4 has no JS config file.
    expect(config.tailwind.config).toBe("");
  });

  it("uses lucide icons", () => {
    expect(config.iconLibrary).toBe("lucide");
  });

  it("aliases components and utils onto the @ path", () => {
    expect(config.aliases.components).toBe("@/components");
    expect(config.aliases.utils).toBe("@/lib/utils");
    expect(config.aliases.ui).toBe("@/components/ui");
  });
});
