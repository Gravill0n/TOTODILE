import { loadRaMapping } from "../review/reviewLoaders";
import type { RaMapping } from "../schema";
import { fetchUnlocks } from "./raClient";
import { computeSync, type SyncReceipt } from "./syncReceipt";
import type { GameId, RaCredentials } from "./types";

// The outcome the guide view acts on. Expected failures are values (§22.4): the
// caller writes marks ONLY on "ok", so any error leaves progress untouched
// (atomic, §8.1/§11.3). `noCredentials` is its own reason so the UI can point at
// Settings without ever touching the network.
export type SyncOutcome =
  | { status: "ok"; receipt: SyncReceipt; toMark: string[] }
  | {
      status: "error";
      reason: "auth" | "rateLimit" | "network" | "noCredentials";
    };

type SyncArgs = {
  slug: string;
  raGameId: GameId;
  credentials: RaCredentials | null;
  doneIds: ReadonlySet<string>;
};

// Injected so the fake-client tests are trivial (§12.2); the defaults are the
// real isolated client and the standalone ra-mapping loader (§6.5).
export type SyncDeps = {
  fetchUnlocks: typeof fetchUnlocks;
  loadMapping: (slug: string) => Promise<RaMapping | null>;
};

const defaultDeps: SyncDeps = {
  fetchUnlocks,
  loadMapping: loadRaMapping,
};

export async function syncGuide(
  { slug, raGameId, credentials, doneIds }: SyncArgs,
  deps: SyncDeps = defaultDeps,
): Promise<SyncOutcome> {
  if (!credentials) return { status: "error", reason: "noCredentials" };

  const mapping = await deps.loadMapping(slug);
  const result = await deps.fetchUnlocks(credentials, raGameId);
  if (result.status === "error") {
    return { status: "error", reason: result.reason };
  }

  const { receipt, toMark } = computeSync(
    result.unlocked,
    mapping?.entries ?? [],
    doneIds,
  );
  return { status: "ok", receipt, toMark };
}
