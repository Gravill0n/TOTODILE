import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const CONTENT_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

// In production, library.json and guides/ are copied beside dist/ (§21.3),
// so the app fetches plain relative URLs. In dev, serve the same paths
// straight from the repo root — no copies, no symlinks.
function serveRepoContent(): Plugin {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  return {
    name: "totodile-serve-repo-content",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        if (url !== "/library.json" && !url.startsWith("/guides/")) {
          return next();
        }
        const path = normalize(join(repoRoot, decodeURIComponent(url)));
        if (!path.startsWith(repoRoot)) return next();
        try {
          const body = await readFile(path);
          res.setHeader(
            "content-type",
            CONTENT_TYPES[extname(path)] ?? "application/octet-stream",
          );
          res.end(body);
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveRepoContent()],
  test: {
    environment: "node",
  },
});
