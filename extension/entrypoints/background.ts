/**
 * background.ts — service worker: message routing + closed-tab grade watching.
 *
 * NOTE: MV3 service workers are NOT always-on. They die ~30s after idle, so the
 * grade poll is driven by chrome.alarms (which wakes the worker), and HTML parsing
 * is delegated to an offscreen document (SWs have no DOMParser).
 */
import { buildSchoologyData, checkSafetyGuards, type ScrapeOutput } from '../lib/scrape-dom';
import { validateSchoologyData, type SchoologyData } from '../lib/schemas';
import { saveGradeData, loadGradeData, saveScrapeMeta } from '../lib/storage';
import { appendGradeHistory } from '../lib/grade-history';
import { detectChanges, appendChanges, type ChangeEvent } from '../lib/grade-changes';
import { saveWatchStatus } from '../lib/watch-status';
import { countAssignments } from '../lib/transform';
import { loadSettings } from '../lib/settings';
import { runDueSoonCheck } from '../lib/due-soon';
import { sendDiscordAlerts } from '../lib/discord-alerts';

// ── Constants ──────────────────────────────────────────────────────
const POLL_ALARM = 'bs-grade-poll';
const POLL_MINUTES = 15;

// ── Worker-local network helper ────────────────────────────────────
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

// ── Side panel API (Chrome-only, untyped by the polyfill) ──────────
// chrome.sidePanel is Chrome-only and not in the webextension-polyfill types.
type SidePanelApi = {
  setPanelBehavior?: (o: { openPanelOnActionClick: boolean }) => Promise<void>;
  open?: (o: { tabId: number } | { windowId: number }) => Promise<void>;
};
const sidePanel = (globalThis as unknown as { chrome?: { sidePanel?: SidePanelApi } }).chrome?.sidePanel;

// ── Notifications ──────────────────────────────────────────────────
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

/** Fire a desktop notification and optional Discord webhook for change events. */
async function notifyChanges(events: ChangeEvent[]) {
  if (!events.length) return;
  const settings = await loadSettings();
  // Drop events for muted courses.
  const visible = events.filter((e) => !('course' in e) || !settings.mutedCourses.includes(e.course));
  if (!visible.length) return;

  if (settings.notifications) {
    const title = visible.length === 1 ? 'Schoology update' : `${visible.length} Schoology updates`;
    const message = visible.slice(0, 4).map(eventLine).join('\n');
    void browser.notifications.create(`bs-change-${Date.now()}`, {
      type: 'basic',
      iconUrl: (browser.runtime.getURL as (p: string) => string)('/icon/128.png'),
      title,
      message,
      priority: 2,
    });
  }

  if (settings.discordWebhook) {
    void sendDiscordAlerts(visible, settings.discordWebhook).catch(() => {});
  }
}

// ── Offscreen document (HTML parsing for the closed-tab poll) ──────
// A service worker has no DOMParser, so grade HTML is parsed in an offscreen
// document (the only MV3 context with full DOM access from the worker).
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

// ── Closed-tab grade poll ──────────────────────────────────────────

/**
 * The school's Schoology origin cached by the content script, or null if the
 * user has never opened Schoology in this browser (so we don't know the URL yet).
 */
async function getCachedSchoologyOrigin(): Promise<string | null> {
  const stored = await browser.storage.local.get('bs_sgy_origin');
  const origin = stored.bs_sgy_origin;
  if (typeof origin !== 'string' || !origin.includes('schoology.com')) return null;
  return origin;
}

/** True if the fetched HTML is a login/auth page (i.e. the session expired). */
function isLoginPage(html: string): boolean {
  return html.includes('id="edit-mail"') || html.includes('accounts.google.com') || html.includes('Sign in');
}

/**
 * Fetch the grades page using the cached origin + the user's cookies.
 * Returns the HTML, or null after recording why it failed (network/session).
 */
async function fetchGradesHtml(origin: string): Promise<string | null> {
  let res: Response;
  try {
    res = await workerFetch(`${origin}/grades/grades`, { credentials: 'include', redirect: 'follow' });
  } catch {
    await saveWatchStatus({ ok: false, reason: 'network', ts: Date.now() });
    return null;
  }
  if (!res.ok) {
    await saveWatchStatus({ ok: false, reason: 'network', ts: Date.now() });
    return null;
  }
  const html = await res.text();
  if (isLoginPage(html)) {
    await saveWatchStatus({ ok: false, reason: 'session', ts: Date.now() });
    return null;
  }
  return html;
}

/**
 * Parse + validate the grades HTML into SchoologyData, running the same safety
 * guards as the live scrape. Returns null after recording a 'parse' failure.
 */
async function parseAndValidateGrades(
  html: string,
  previous: SchoologyData | null,
): Promise<SchoologyData | null> {
  const fail = async () => {
    await saveWatchStatus({ ok: false, reason: 'parse', ts: Date.now() });
    return null;
  };

  const output = await parseGradesOffscreen(html);
  if (!output || output.courses.length === 0) return fail();

  const data = buildSchoologyData(output);
  if (!validateSchoologyData(data).success) return fail();
  if (!checkSafetyGuards(data, previous).safe) return fail();
  return data;
}

/** Auto-open the side panel on all windows so the activity feed is visible. */
function openPanelOnAllWindows(): void {
  browser.windows.getAll()
    .then((ws) => ws.forEach((w) => { if (w.id != null) sidePanel?.open?.({ windowId: w.id }).catch(() => {}); }))
    .catch(() => {});
}

/** Persist fresh grade data, then diff against the previous snapshot and notify. */
async function persistAndNotify(previous: SchoologyData | null, data: SchoologyData): Promise<void> {
  await saveGradeData(data);
  await appendGradeHistory(data.courses);

  const events = detectChanges(previous, data);
  if (events.length) {
    await appendChanges(events);
    void notifyChanges(events);
    openPanelOnAllWindows();
  }

  await saveWatchStatus({ ok: true, ts: Date.now() });
  await saveScrapeMeta({
    status: 'fresh',
    scrapedAt: data.scrapedAt,
    courseCount: data.courses.length,
    assignmentCount: countAssignments(data.courses),
    error: null,
  });
  void runDueSoonCheck(data.courses);
}

/**
 * Poll grades with no Schoology tab open. Uses the origin the content script cached
 * + the user's cookies; parses via the offscreen doc; diffs, saves, and notifies.
 * Silently no-ops if the user has never opened Schoology or the session expired.
 */
async function runClosedTabPoll(): Promise<void> {
  const origin = await getCachedSchoologyOrigin();
  if (!origin) return;

  const html = await fetchGradesHtml(origin);
  if (!html) return;

  const previous = await loadGradeData();
  const data = await parseAndValidateGrades(html, previous);
  if (!data) return;

  await persistAndNotify(previous, data);
}

// ── Message handlers ───────────────────────────────────────────────

type FetchFileResult =
  | { ok: true; base64: string; contentType: string; size: number }
  | { ok: false; error: string };

/**
 * Fetch a Schoology file on behalf of the content script. Attachments 302 from
 * the school's schoology.com subdomain to files-cdn.schoology.com — a content
 * script fetch dies on CORS there, but the background worker is exempt for hosts
 * in host_permissions. Bytes go back as base64 because runtime messaging is
 * JSON-only (no ArrayBuffer transfer).
 */
async function handleFetchFile(url: string): Promise<FetchFileResult> {
  try {
    const u = new URL(url);
    // Any *.schoology.com host (school subdomains + files-cdn/asset-cdn)
    if (!u.hostname.endsWith('.schoology.com') && u.hostname !== 'schoology.com') {
      return { ok: false, error: 'Host not allowed' };
    }
    const res = await workerFetch(url, { credentials: 'include', redirect: 'follow' });
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
}

export default defineBackground(() => {
  console.log('[BS] Background service worker started');

  // Closed-tab grade watcher: an alarm wakes the worker on a timer (survives SW idle).
  // Interval is user-configurable; re-arm the alarm when the setting changes.
  const armPoll = (minutes: number) =>
    browser.alarms.create(POLL_ALARM, { periodInMinutes: Math.max(1, minutes) });
  void loadSettings().then((s) => armPoll(s.pollMinutes || POLL_MINUTES));
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_ALARM) void runClosedTabPoll();
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.bs_settings) {
      void loadSettings().then((s) => armPoll(s.pollMinutes || POLL_MINUTES));
    }
  });

  // ── Side panel open/close wiring ─────────────────────────────────
  const openPanel = (windowId: number) => sidePanel?.open?.({ windowId }).catch(() => {});
  const openPanelInCurrentWindow = () =>
    browser.windows.getCurrent().then((w) => { if (w?.id != null) openPanel(w.id); }).catch(() => {});

  // openPanelOnActionClick is a fallback; explicit onClicked is more reliable.
  sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});
  browser.action.onClicked.addListener((tab) => {
    const wid = tab.windowId;
    if (wid != null) openPanel(wid);
  });

  // Auto-open on first install + on every existing window at startup.
  browser.runtime.onInstalled.addListener(() => {
    browser.windows.getAll().then((ws) => ws.forEach((w) => { if (w.id != null) openPanel(w.id); })).catch(() => {});
  });
  browser.windows.getAll().then((ws) => ws.forEach((w) => { if (w.id != null) openPanel(w.id); })).catch(() => {});
  browser.windows.onCreated.addListener((w) => { if (w.id != null) openPanel(w.id); });

  // Clicking a grade notification reopens the side panel.
  browser.notifications.onClicked.addListener(() => openPanelInCurrentWindow());

  // ── Message routing (content script ↔ worker) ────────────────────
  browser.runtime.onMessage.addListener(
    (message, sender) => {
      if (!message || typeof message !== 'object' || !('type' in message)) return;
      const msg = message as { type: string; url?: string; events?: ChangeEvent[] };

      if (msg.type === 'ping') {
        return Promise.resolve({ type: 'pong', ts: Date.now() });
      }

      if (msg.type === 'open-panel') {
        const tabId = sender.tab?.id;
        const wid = sender.tab?.windowId;
        if (tabId != null) {
          sidePanel?.open?.({ tabId }).catch(() => {});
        } else if (wid != null) {
          sidePanel?.open?.({ windowId: wid }).catch(() => {});
        } else {
          browser.windows.getLastFocused().then((w) => {
            if (w?.id != null) sidePanel?.open?.({ windowId: w.id }).catch(() => {});
          }).catch(() => {});
        }
        return;
      }

      if (msg.type === 'change' && Array.isArray(msg.events)) {
        void notifyChanges(msg.events);
        return;
      }

      if (msg.type === 'fetch-file' && msg.url) {
        return handleFetchFile(msg.url);
      }
      // Future: scrape trigger, alarm registration, etc.
    },
  );

  // Extension install/update hook — useful for version-migration in Phase 1+
  browser.runtime.onInstalled.addListener((details) => {
    console.log('[BS] onInstalled:', details.reason);
  });
});

