/**
 * background.ts — service worker: message routing + closed-tab grade watching.
 *
 * NOTE: MV3 service workers are NOT always-on. They die ~30s after idle, so the
 * grade poll is driven by chrome.alarms (which wakes the worker), and HTML parsing
 * is delegated to an offscreen document (SWs have no DOMParser).
 */
import { buildSchoologyData, checkSafetyGuards, type ScrapeOutput } from '../lib/scrape-dom';
import { validateSchoologyData } from '../lib/schemas';
import { saveGradeData, loadGradeData, saveScrapeMeta } from '../lib/storage';
import { appendGradeHistory } from '../lib/grade-history';
import { detectChanges, appendChanges, type ChangeEvent } from '../lib/grade-changes';
import { saveWatchStatus } from '../lib/watch-status';
import { countAssignments } from '../lib/transform';

const POLL_ALARM = 'bs-grade-poll';
const POLL_MINUTES = 15;
/**
 * fetch() with 429/503 retry for the worker. The content script funnels its requests
 * through lib/sgy-net's global queue, but the worker is a separate context and can't
 * share it — so it gets its own small retry (Retry-After, else backoff + jitter).
 */
async function workerFetch(url: string, init?: RequestInit, retries = 4): Promise<Response> {
  let res = await fetch(url, init);
  for (let i = 0; (res.status === 429 || res.status === 503) && i < retries; i++) {
    const ra = res.headers.get('Retry-After');
    const secs = ra ? Number(ra) : NaN;
    const wait = Number.isFinite(secs)
      ? Math.min(secs * 1000, 15000)
      : Math.min(500 * 2 ** i, 8000) + Math.random() * 250;
    await new Promise((r) => setTimeout(r, wait));
    res = await fetch(url, init);
  }
  return res;
}

// chrome.sidePanel is Chrome-only and not in the webextension-polyfill types.
type SidePanelApi = {
  setPanelBehavior?: (o: { openPanelOnActionClick: boolean }) => Promise<void>;
  open?: (o: { windowId: number }) => Promise<void>;
};
const sidePanel = (browser as unknown as { sidePanel?: SidePanelApi }).sidePanel;

/** One-line summary of a change event for a notification. */
function eventLine(e: ChangeEvent): string {
  switch (e.kind) {
    case 'grade': {
      const arrow = e.delta >= 0 ? '▲' : '▼';
      return `${arrow} ${e.course} ${e.delta >= 0 ? 'rose' : 'fell'} ${Math.abs(e.delta).toFixed(1)}% · ${e.oldPct?.toFixed(1)}% → ${e.newPct?.toFixed(1)}%`;
    }
    case 'graded':
      return `✓ Graded · ${e.name}${e.pct !== null ? ` — ${e.pct.toFixed(0)}%` : ''} (${e.course})`;
    case 'new-assignment':
      return `＋ New assignment · ${e.name} (${e.course})`;
  }
}

/** Fire a desktop notification summarizing one or more change events. */
function notifyChanges(events: ChangeEvent[]) {
  if (!events.length) return;
  const title = events.length === 1 ? 'Schoology update' : `${events.length} Schoology updates`;
  const message = events.slice(0, 4).map(eventLine).join('\n');
  void browser.notifications.create(`bs-change-${Date.now()}`, {
    type: 'basic',
    iconUrl: (browser.runtime.getURL as (p: string) => string)('/icon/128.png'),
    title,
    message,
    priority: 2,
  });
}

// chrome.offscreen is Chrome-only / not in the polyfill types.
type OffscreenApi = {
  hasDocument?: () => Promise<boolean>;
  createDocument?: (o: { url: string; reasons: string[]; justification: string }) => Promise<void>;
};
const offscreenApi = (globalThis as { chrome?: { offscreen?: OffscreenApi } }).chrome?.offscreen;
const getURL = browser.runtime.getURL as (p: string) => string;

async function ensureOffscreen(): Promise<boolean> {
  if (!offscreenApi?.createDocument) return false;
  try {
    if (offscreenApi.hasDocument && (await offscreenApi.hasDocument())) return true;
    await offscreenApi.createDocument({
      url: getURL('/offscreen.html'),
      reasons: ['DOM_PARSER'],
      justification: 'Parse the Schoology grades page to detect grade changes.',
    });
    return true;
  } catch {
    return false;
  }
}

/** Send fetched HTML to the offscreen document and get the scraped output back. */
async function parseGradesOffscreen(html: string): Promise<ScrapeOutput | null> {
  if (!(await ensureOffscreen())) return null;
  try {
    const resp = await browser.runtime.sendMessage({ type: 'bs-parse-grades', html });
    const r = resp as { ok?: boolean; output?: ScrapeOutput } | undefined;
    return r?.ok && r.output ? r.output : null;
  } catch {
    return null;
  }
}

/**
 * Poll grades with no Schoology tab open. Uses the origin the content script cached
 * + the user's cookies; parses via the offscreen doc; diffs, saves, and notifies.
 * Silently no-ops if the user has never opened Schoology or the session expired.
 */
async function runClosedTabPoll(): Promise<void> {
  const stored = await browser.storage.local.get('bs_sgy_origin');
  const origin = stored.bs_sgy_origin;
  // Never opened Schoology in this browser — we don't know the school URL yet.
  if (typeof origin !== 'string' || !origin.includes('schoology.com')) return;

  let res: Response;
  try {
    res = await workerFetch(`${origin}/grades/grades`, { credentials: 'include', redirect: 'follow' });
  } catch {
    await saveWatchStatus({ ok: false, reason: 'network', ts: Date.now() });
    return;
  }
  if (!res.ok) {
    await saveWatchStatus({ ok: false, reason: 'network', ts: Date.now() });
    return;
  }
  const html = await res.text();
  if (html.includes('id="edit-mail"') || html.includes('accounts.google.com') || html.includes('Sign in')) {
    await saveWatchStatus({ ok: false, reason: 'session', ts: Date.now() });
    return;
  }

  const output = await parseGradesOffscreen(html);
  if (!output || output.courses.length === 0) {
    await saveWatchStatus({ ok: false, reason: 'parse', ts: Date.now() });
    return;
  }

  const data = buildSchoologyData(output);
  if (!validateSchoologyData(data).success) {
    await saveWatchStatus({ ok: false, reason: 'parse', ts: Date.now() });
    return;
  }

  const previous = await loadGradeData();
  if (!checkSafetyGuards(data, previous).safe) {
    await saveWatchStatus({ ok: false, reason: 'parse', ts: Date.now() });
    return;
  }

  await saveGradeData(data);
  await appendGradeHistory(data.courses);
  const events = detectChanges(previous, data);
  if (events.length) {
    await appendChanges(events);
    notifyChanges(events);
  }
  await saveWatchStatus({ ok: true, ts: Date.now() });
  await saveScrapeMeta({
    status: 'fresh',
    scrapedAt: data.scrapedAt,
    courseCount: data.courses.length,
    assignmentCount: countAssignments(data.courses),
    error: null,
  });
}

export default defineBackground(() => {
  console.log('[BS] Background service worker started');

  // Closed-tab grade watcher: an alarm wakes the worker on a timer (survives SW idle).
  browser.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_ALARM) void runClosedTabPoll();
  });

  // Clicking the toolbar icon opens the Better SGY side panel (works on any tab).
  sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});

  // Clicking a grade notification opens the side panel to the detail.
  browser.notifications.onClicked.addListener(() => {
    browser.windows.getCurrent().then((w) => {
      if (w?.id != null) sidePanel?.open?.({ windowId: w.id }).catch(() => {});
    }).catch(() => {});
  });

  browser.runtime.onMessage.addListener(
    (message, _sender) => {
      if (!message || typeof message !== 'object' || !('type' in message)) return;
      const msg = message as { type: string; url?: string; events?: ChangeEvent[] };

      if (msg.type === 'ping') {
        return Promise.resolve({ type: 'pong', ts: Date.now() });
      }

      if (msg.type === 'change' && Array.isArray(msg.events)) {
        notifyChanges(msg.events);
        return;
      }

      // Fetch a Schoology file on behalf of the content script. Attachments
      // 302 from the school's schoology.com subdomain to files-cdn.schoology.com
      // — a content script fetch dies on CORS there; the background worker is
      // exempt for hosts in host_permissions. Bytes go back as base64 (runtime
      // messaging is JSON-only — no ArrayBuffer transfer).
      if (msg.type === 'fetch-file' && msg.url) {
        return (async () => {
          try {
            const u = new URL(msg.url!);
            // Any *.schoology.com host (school subdomains + files-cdn/asset-cdn)
            if (!u.hostname.endsWith('.schoology.com') && u.hostname !== 'schoology.com') {
              return { ok: false, error: 'Host not allowed' };
            }
            const res = await workerFetch(msg.url!, { credentials: 'include', redirect: 'follow' });
            if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
            const contentType = res.headers.get('content-type') ?? '';
            if (contentType.includes('text/html')) {
              return { ok: false, error: 'Not a direct file link' };
            }
            const buf = await res.arrayBuffer();
            // Chunked btoa — avoids call-stack overflow on multi-MB files
            const bytes = new Uint8Array(buf);
            let binary = '';
            const CHUNK = 0x8000;
            for (let i = 0; i < bytes.length; i += CHUNK) {
              binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
            }
            return { ok: true, base64: btoa(binary), contentType, size: bytes.length };
          } catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : String(err) };
          }
        })();
      }
      // Future: scrape trigger, alarm registration, etc.
    },
  );

  // Extension install/update hook — useful for version-migration in Phase 1+
  browser.runtime.onInstalled.addListener((details) => {
    console.log('[BS] onInstalled:', details.reason);
  });
});

