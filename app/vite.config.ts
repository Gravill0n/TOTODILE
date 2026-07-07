import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Connect, Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { collectContentManifestEntries } from "./scripts/contentPrecache.ts";

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, "..");

const CONTENT_TYPES: Record<string, string> = {
  ".json": "application/json",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

// In production, library.json and guides/ are copied beside dist/ (§21.3),
// so the app fetches plain relative URLs. In dev and preview, serve the same
// paths straight from the repo root — no copies, no symlinks. Preview needs
// this because offline/PWA behavior is only testable there (§21.3).
function serveRepoContent(): Plugin {
  const middleware: Connect.NextHandleFunction = async (req, res, next) => {
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
      // A missing content file is a real 404 (matching static hosting beside
      // dist/), never the SPA index.html fallback — otherwise JSON loaders
      // would parse HTML. Absent files are expected (e.g. an unapproved
      // guide has no approvals.json, §6.7).
      res.statusCode = 404;
      res.end("Not found");
    }
  };
  return {
    name: "totodile-serve-repo-content",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  // Set only by the Pages deploy workflow (e.g. "/TOTODILE/") — the app's
  // routes (hash history), content fetches, and precache entries are all
  // relative, so base is the one build-time knob a subpath host needs.
  // Never set it for dev/preview: serveRepoContent serves content at "/".
  base: process.env.TOTODILE_BASE ?? "/",
  // `@`→ src; shared by vite dev, build, and vitest (F1).
  resolve: {
    alias: {
      "@": resolve(appRoot, "src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    serveRepoContent(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "TOTODILE",
        short_name: "TOTODILE",
        description:
          "Tracker Of Things, Order, Data, Items, Lists & Everything",
        display: "standalone",
        // Mirrors --color-paper (light) in src/index.css — keep in sync;
        // manifests can't vary by color scheme (§9.1).
        theme_color: "#f6f1e7",
        background_color: "#f6f1e7",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
        // Guide data + images live beside dist/, not in it, so the dist glob
        // can't see them; precache them explicitly (§5.3, §19).
        additionalManifestEntries: collectContentManifestEntries(repoRoot),
      },
    }),
  ],
  test: {
    environment: "node",
    coverage: {
      // Test infra is not product code — keep the report about src proper.
      exclude: ["src/testing/**", "**/*.test.*"],
    },
  },
  define: {
    "process.env": {},
  },
});
