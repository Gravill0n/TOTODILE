// §15 risk 8: ask the browser to exempt our origin (the IndexedDB progress
// store) from storage-pressure eviction. Best-effort by design — unsupported
// browsers and silent denials are fine; export/import stays the accepted
// recovery path (§11.3). Never throws, never shows UI.
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
