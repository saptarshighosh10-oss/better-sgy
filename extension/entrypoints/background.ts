/**
 * background.ts — Phase 0
 * Minimal service worker: just message routing.
 * chrome.alarms, periodic refresh, and scrape triggering are Phase 3+.
 *
 * NOTE: MV3 service workers are NOT always-on. They die ~30s after idle.
 * Never architect Phase 1+ refresh as if this is an always-running server.
 */
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

interface GradeChangeMsg {
  course: string;
  oldPct: number | null;
  newPct: number | null;
  delta: number;
}

// chrome.sidePanel is Chrome-only and not in the webextension-polyfill types.
type SidePanelApi = {
  setPanelBehavior?: (o: { openPanelOnActionClick: boolean }) => Promise<void>;
  open?: (o: { windowId: number }) => Promise<void>;
};
const sidePanel = (browser as unknown as { sidePanel?: SidePanelApi }).sidePanel;

/** Fire a desktop notification summarizing one or more grade changes. */
function notifyGradeChanges(changes: GradeChangeMsg[]) {
  if (!changes.length) return;
  const fmt = (c: GradeChangeMsg) => {
    const dir = c.delta >= 0 ? 'rose' : 'fell';
    const arrow = c.delta >= 0 ? '▲' : '▼';
    return `${arrow} ${c.course} ${dir} ${Math.abs(c.delta).toFixed(1)}% · ${c.oldPct?.toFixed(1)}% → ${c.newPct?.toFixed(1)}%`;
  };
  const title = changes.length === 1 ? 'Grade updated' : `${changes.length} grades updated`;
  const message = changes.slice(0, 4).map(fmt).join('\n');
  void browser.notifications.create(`bs-grade-${Date.now()}`, {
    type: 'basic',
    iconUrl: (browser.runtime.getURL as (p: string) => string)('/icon/128.png'),
    title,
    message,
    priority: 2,
  });
}

export default defineBackground(() => {
  console.log('[BS] Background service worker started');

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
      const msg = message as { type: string; url?: string; changes?: GradeChangeMsg[] };

      if (msg.type === 'ping') {
        return Promise.resolve({ type: 'pong', ts: Date.now() });
      }

      if (msg.type === 'grade-change' && Array.isArray(msg.changes)) {
        notifyGradeChanges(msg.changes);
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

