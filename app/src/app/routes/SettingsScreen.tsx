import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { importSlots, readAllSlots } from "@/features/progress/progressStore";
import { setEditorMode, useEditorMode } from "@/features/review/editorMode";
import {
  clearCredentials,
  getCredentials,
  setCredentials,
} from "@/features/sync/raCredentials";
import { progressExport, SCHEMA_VERSION } from "@/schema";

// RA username + API key entry. The key lives only in browser storage (§17.4):
// never committed, logged, or written into a progress export. Kept as its own
// component so the field state stays local.
function RaCredentialsSection() {
  const saved = getCredentials();
  const [username, setUsername] = useState(saved?.username ?? "");
  const [apiKey, setApiKey] = useState(saved?.webApiKey ?? "");
  const [status, setStatus] = useState<"saved" | "cleared" | null>(null);

  return (
    <section className="mt-8">
      <h2 className="font-bold">RetroAchievements</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Username and web API key for Sync (Phase 4). Stored in this browser only
        — never committed, exported, or logged (§5.2). Sync never runs on its
        own; it is always an explicit action.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:max-w-sm">
        <Input
          type="text"
          value={username}
          aria-label="RA username"
          placeholder="RA username"
          autoComplete="off"
          onChange={(event) => setUsername(event.target.value)}
        />
        <Input
          type="password"
          value={apiKey}
          aria-label="RA API key"
          placeholder="RA web API key"
          autoComplete="off"
          onChange={(event) => setApiKey(event.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setCredentials({ username, webApiKey: apiKey });
              setStatus("saved");
            }}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-ink-soft"
            onClick={() => {
              clearCredentials();
              setUsername("");
              setApiKey("");
              setStatus("cleared");
            }}
          >
            Clear
          </Button>
          {status ? (
            <span role="status" className="text-sm text-primary">
              {status === "saved"
                ? "Credentials saved."
                : "Credentials cleared."}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

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
  const editorMode = useEditorMode();

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
          <Button type="button" variant="outline" onClick={exportProgress}>
            Export progress
          </Button>
          <Button asChild variant="outline">
            <label>
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
          </Button>
        </div>
        {importResult ? (
          <p
            role="status"
            className={`mt-3 text-sm ${
              importResult.status === "error" ? "text-missable" : "text-primary"
            }`}
          >
            {importResult.status === "ok"
              ? `Imported progress for ${importResult.count} guide(s).`
              : importResult.message}
          </p>
        ) : null}
      </section>
      <section className="mt-8">
        <h2 className="font-bold">Editor mode</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Reveals the review lens and unfinished guides still being compiled
          (§9.3). Player mode stays clean — off by default.
        </p>
        <Label className="mt-3 flex w-fit items-center gap-2 text-sm font-normal">
          <Switch
            checked={editorMode}
            onCheckedChange={setEditorMode}
            aria-label="Editor mode"
          />
          Editor mode
        </Label>
      </section>
      <RaCredentialsSection />
      <p className="mt-8 text-sm">
        <Link to="/" className="underline">
          Back to the library
        </Link>
      </p>
    </main>
  );
}
