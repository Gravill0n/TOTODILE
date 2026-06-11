import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { importSlots, readAllSlots } from "../progress/progressStore";
import { progressExport, SCHEMA_VERSION } from "../schema";

type ImportResult =
  | { status: "ok"; count: number }
  | { status: "error"; message: string }
  | null;

async function buildExport() {
  return progressExport.parse({
    kind: "totodile-progress",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    slots: await readAllSlots(),
  });
}

export function SettingsScreen() {
  const [importResult, setImportResult] = useState<ImportResult>(null);

  const exportProgress = async () => {
    const payload = await buildExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `totodile-progress-${payload.exportedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // An invalid file is an expected failure: a returned value shown in the
  // UI, never a throw — and never a partial write (§22.4, §11.1).
  const importProgress = async (file: File) => {
    let slots: Awaited<ReturnType<typeof buildExport>>["slots"];
    try {
      slots = progressExport.parse(JSON.parse(await file.text())).slots;
    } catch {
      setImportResult({
        status: "error",
        message: "Not a valid TOTODILE progress export — nothing was imported.",
      });
      return;
    }
    await importSlots(slots);
    setImportResult({ status: "ok", count: slots.length });
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <section className="mt-6">
        <h2 className="font-bold">Progress backup</h2>
        <p className="mt-1 text-sm text-ink-soft">
          One file holds the progress of every guide — export here, import on
          the other device (FR-B6). Importing replaces each contained guide's
          progress wholesale.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={exportProgress}
            className="rounded border border-line bg-card px-3 py-1"
          >
            Export progress
          </button>
          <label className="rounded border border-line bg-card px-3 py-1">
            Import progress
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importProgress(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {importResult ? (
          <p
            role="status"
            className={`mt-3 text-sm ${
              importResult.status === "error" ? "text-missable" : "text-accent"
            }`}
          >
            {importResult.status === "ok"
              ? `Imported progress for ${importResult.count} guide(s).`
              : importResult.message}
          </p>
        ) : null}
      </section>
      <section className="mt-8">
        <h2 className="font-bold">RetroAchievements</h2>
        <p className="mt-1 text-sm text-ink-soft">
          RA username and API key arrive with Sync (Phase 4). The key lives in
          browser storage only — never in the repo (§5.2).
        </p>
      </section>
      <p className="mt-8 text-sm">
        <Link to="/" className="underline">
          Back to the library
        </Link>
      </p>
    </main>
  );
}
