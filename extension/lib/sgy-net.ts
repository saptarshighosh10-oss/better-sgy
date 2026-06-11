/**
 * sgy-net.ts — one global rate-limited gate for EVERY Schoology request.
 *
 * Schoology rate-limits bursts and answers `429 Too Many Requests` (which used to make
 * Messages/Notifications come back empty and Materials fetches fail). Funnelling all
 * requests through a single queue fixes that by:
 *   - capping how many requests are in flight at once (concurrency),
 *   - spacing out when requests *start* (so a dozen calls don't fire in one tick),
 *   - retrying 429/503 — honoring the server's `Retry-After`, else exponential
 *     backoff with jitter, a few times.
 *
 * All Schoology fetching in the content script should go through `queuedFetch` (sgyFetch
 * already does). The background worker is a separate context — see its own retry helper.
 */

const MAX_CONCURRENT = 2;   // at most N requests in flight together
const MIN_SPACING_MS = 150; // minimum gap between request *starts*
const MAX_RETRIES = 4;      // extra attempts on 429/503
const RETRY_STATUSES = new Set([429, 503]);
const MAX_BACKOFF_MS = 15000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let active = 0;
let nextStart = 0; // earliest timestamp the next request is allowed to start
const waiters: Array<() => void> = [];

function pump(): void {
  if (active >= MAX_CONCURRENT) return;
  const next = waiters.shift();
  if (!next) return;
  active++;
  next();
}

/** Wait for a concurrency slot, then for the spacing gate. Resolves when it's our turn. */
function acquire(): Promise<void> {
  return new Promise((resolve) => {
    waiters.push(async () => {
      const now = Date.now();
      const start = Math.max(now, nextStart);
      nextStart = start + MIN_SPACING_MS; // reserve our slot synchronously
      const wait = start - now;
      if (wait > 0) await sleep(wait);
      resolve();
    });
    pump();
  });
}

function release(): void {
  active = Math.max(0, active - 1);
  pump();
}

function backoffMs(attempt: number, retryAfter: string | null): number {
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) return Math.min(secs * 1000, MAX_BACKOFF_MS);
    const when = Date.parse(retryAfter);
    if (!Number.isNaN(when)) return Math.max(0, Math.min(when - Date.now(), MAX_BACKOFF_MS));
  }
  const base = Math.min(500 * 2 ** attempt, 8000); // 500, 1000, 2000, 4000, 8000
  return base + Math.random() * 250;               // jitter so retries don't sync up
}

/**
 * A drop-in `fetch()` for Schoology requests: concurrency-capped, spaced out, and
 * retried on 429/503. Same call signature and return as `fetch`.
 */
export async function queuedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  await acquire();
  try {
    let res = await fetch(input, init);
    for (let attempt = 0; RETRY_STATUSES.has(res.status) && attempt < MAX_RETRIES; attempt++) {
      await sleep(backoffMs(attempt, res.headers.get('Retry-After')));
      res = await fetch(input, init);
    }
    return res;
  } finally {
    release();
  }
}
