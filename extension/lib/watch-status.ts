/**
 * watch-status.ts — health of the background grade watcher, surfaced in the side
 * panel. The poll (in-tab or closed-tab) writes ok/last-checked here; on failure it
 * records *why* so the panel can tell you to re-open Schoology vs. just retry.
 */
export type WatchReason = 'session' | 'network' | 'parse';

export interface WatchStatus {
  ok: boolean;
  reason?: WatchReason;
  ts: number; // last attempt
}

const KEY = 'bs_watch_status';

export async function saveWatchStatus(status: WatchStatus): Promise<void> {
  await browser.storage.local.set({ [KEY]: status });
}

export async function loadWatchStatus(): Promise<WatchStatus | null> {
  const r = await browser.storage.local.get(KEY);
  return (r[KEY] as WatchStatus) ?? null;
}
