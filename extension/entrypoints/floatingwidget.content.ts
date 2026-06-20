import { loadGradeData } from '../lib/storage';
import { loadChanges, dedupeChanges, type ChangeEvent } from '../lib/grade-changes';
import { parseGradeString } from '../lib/grade-utils';
import { loadCachedAnnouncements } from '../lib/announcement-cache';
import { loadWatchStatus } from '../lib/watch-status';
import { computeSemesterTrend } from '../lib/grade-history';
import { loadSettings } from '../lib/settings';
import { safeExternalUrl, openSafe } from '../lib/safe-url';

export default defineContentScript({
  matches: ['https://*/*', 'http://*/*'],
  runAt: 'document_idle',
  main() {
    if (location.hostname.endsWith('.schoology.com') || location.hostname === 'schoology.com') return;
    if (!document.body) return;
    // Mount guard — a re-injected content script must not stack duplicate buttons.
    if (document.getElementById('bs-float-btn')) return;

    let theme = { bg: '#0e0e12', text: '#f5f5f7', card: '#1c1c1e', border: 'rgba(255,255,255,0.1)', primary: '#3b82f6', fresh: '#34c759', failed: '#ff3b30', muted: 'rgba(235,235,245,0.45)' };

    // ── Button — a compact rounded-rectangle "grade card" ──────────────────────
    const btn = document.createElement('button');
    btn.id = 'bs-float-btn';
    Object.assign(btn.style, {
      all: 'unset', position: 'fixed', bottom: '24px', right: '24px',
      zIndex: '2147483647', minWidth: '108px', borderRadius: '16px',
      display: 'flex', alignItems: 'center', gap: '11px',
      padding: '11px 15px', cursor: 'pointer', userSelect: 'none',
      fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
      transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease',
      background: theme.bg, color: theme.text,
      boxShadow: '0 6px 28px rgba(0,0,0,0.5),0 0 0 1.5px rgba(255,255,255,0.1)',
      overflow: 'hidden',
    });
    btn.onmouseenter = () => { btn.style.transform = 'translateY(-3px) scale(1.03)'; btn.style.boxShadow = '0 12px 36px rgba(0,0,0,0.55),0 0 0 1.5px rgba(255,255,255,0.18)'; };
    btn.onmouseleave = () => { btn.style.transform = 'none'; btn.style.boxShadow = '0 6px 28px rgba(0,0,0,0.5),0 0 0 1.5px rgba(255,255,255,0.1)'; };
    btn.onmousedown = () => { btn.style.transform = 'scale(0.96)'; };
    btn.onmouseup   = () => { btn.style.transform = 'translateY(-3px) scale(1.03)'; };
    document.body.appendChild(btn);

    // ── Backdrop ──────────────────────────────────────────────────────────────
    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position: 'fixed', inset: '0', zIndex: '2147483645',
      background: 'rgba(0,0,0,0.3)', display: 'none',
    });
    backdrop.onclick = close;
    document.body.appendChild(backdrop);

    // ── Panel ─────────────────────────────────────────────────────────────────
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed', top: '0', right: '0', height: '100%', width: '320px',
      zIndex: '2147483646', transform: 'translateX(100%)',
      transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      overflowY: 'auto', boxSizing: 'border-box',
      fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
      background: theme.bg, color: theme.text,
      boxShadow: '-4px 0 32px rgba(0,0,0,0.3)',
    });
    document.body.appendChild(panel);

    // Shimmer keyframe (panel lives in the page, not the extension's GlobalStyles).
    const skelStyle = document.createElement('style');
    skelStyle.textContent = `
      @keyframes bsSkelFW { 0% { background-position:-180% 0; } 100% { background-position:180% 0; } }
      .bs-skel-fw {
        border-radius: 8px;
        background-image: linear-gradient(90deg, rgba(128,128,128,0) 0%, rgba(128,128,128,0.16) 20%, rgba(128,128,128,0.28) 50%, rgba(128,128,128,0.16) 80%, rgba(128,128,128,0) 100%);
        background-size: 180% 100%; background-repeat: no-repeat;
        opacity: 0.55; animation: bsSkelFW 1.4s ease-in-out infinite;
      }`;
    (document.head ?? document.documentElement).appendChild(skelStyle);

    // ── State + toggle ────────────────────────────────────────────────────────
    let isOpen = false;
    let selectedCourse: string | null = null;

    function skeleton(): string {
      const t = theme;
      const sk = (w: string, h: number, mt = 0) => `<div class="bs-skel-fw" style="width:${w};height:${h}px;${mt?`margin-top:${mt}px;`:''}"></div>`;
      const card = (rows: number) => `<div style="border-radius:16px;background:${t.card};overflow:hidden;">${
        Array.from({length:rows}).map((_,i) => `<div style="display:flex;align-items:center;gap:10px;padding:13px 16px;${i===rows-1?'':'border-bottom:1px solid '+t.border};"><div style="flex:1;">${sk('60%',13)}${sk('40%',10,7)}</div>${sk('36px',13)}</div>`).join('')
      }</div>`;
      return `<div style="padding:28px 18px 48px;">
        <div style="margin-bottom:24px;">${sk('72px',11)}</div>
        ${sk('130px',44)}${sk('150px',12,12)}
        <div style="margin:28px 2px 10px;">${sk('92px',11)}</div>
        ${card(4)}
        <div style="margin:28px 2px 10px;">${sk('100px',11)}</div>
        ${card(3)}
      </div>`;
    }

    function open() {
      isOpen = true;
      panel.style.transform = 'translateX(0)';
      backdrop.style.display = 'block';
      panel.innerHTML = skeleton();
      void renderPanel();
    }
    function close() {
      isOpen = false;
      panel.style.transform = 'translateX(100%)';
      backdrop.style.display = 'none';
    }

    // One reused AudioContext — browsers cap concurrent contexts (~6), so creating
    // a new one per click would silently stop the chime after a handful of opens.
    let audioCtx: AudioContext | null = null;
    let chimeOn = true;
    void loadSettings().then((s) => { chimeOn = s.chime; });
    function chime() {
      if (!chimeOn) return;
      try {
        audioCtx ??= new AudioContext();
        const ctx = audioCtx;
        if (ctx.state === 'suspended') void ctx.resume();
        [783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine'; osc.frequency.value = freq;
          const t = ctx.currentTime + i * 0.09;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          osc.start(t); osc.stop(t + 0.22);
        });
      } catch {}
    }

    btn.onclick = () => { chime(); isOpen ? close() : open(); };

    // ── Helpers ───────────────────────────────────────────────────────────────
    // Escapes text AND attribute contexts (quotes included) — innerHTML is built
    // from scraped course/assignment/announcement strings.
    const esc = (s: string) => s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    function ago(ts: number) {
      const s = Math.floor((Date.now() - ts) / 1000);
      if (s < 60) return 'just now';
      if (s < 3600) return `${Math.floor(s/60)}m ago`;
      if (s < 86400) return `${Math.floor(s/3600)}h ago`;
      return `${Math.floor(s/86400)}d ago`;
    }

    // ── Render button ─────────────────────────────────────────────────────────
    async function renderBtn() {
      const [data, changes] = await Promise.all([loadGradeData(), loadChanges()]);
      const pcts = (data?.courses ?? []).map(c => parseGradeString(c.grade).percent).filter((p): p is number => p !== null);
      const avg = pcts.length ? pcts.reduce((s,p) => s+p, 0)/pcts.length : null;
      const latest = changes.find(e => e.kind === 'grade') as Extract<ChangeEvent,{kind:'grade'}> | undefined;
      const hasDrop = changes.some(e => e.kind === 'grade' && e.delta < 0);
      const accent = theme.primary || theme.text;

      // Small delta chip (▲/▼) shown only when there's a recent grade move.
      const deltaChip = latest ? `
        <span style="display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:700;line-height:1;
          color:${latest.delta>=0?theme.fresh:theme.failed};">
          ${latest.delta>=0?'▲':'▼'}${Math.abs(latest.delta).toFixed(1)}
        </span>` : '';

      btn.innerHTML = `
        <span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;
          border-radius:10px;background:${accent};color:${theme.bg};font-size:12px;font-weight:800;letter-spacing:0.02em;">
          SGY
        </span>
        <span style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;line-height:1;">
          <span style="font-size:18px;font-weight:750;font-variant-numeric:tabular-nums;line-height:1;color:${theme.text};">
            ${avg !== null ? avg.toFixed(1)+'%' : '—'}
          </span>
          <span style="display:flex;align-items:center;gap:5px;">
            <span style="font-size:9px;font-weight:600;letter-spacing:0.05em;color:${theme.muted};line-height:1;">GRADES</span>
            ${deltaChip}
          </span>
        </span>
        ${hasDrop ? `<span style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;background:${theme.failed};border:2.5px solid ${theme.bg};"></span>` : ''}
      `;
      btn.style.position = 'fixed';
    }

    // ── Trend sparkline (SVG string) ──────────────────────────────────────────
    function trendSvg(points: { ts: number; percent: number }[]): string {
      if (points.length < 2) {
        return `<div style="font-size:11px;color:${theme.muted};padding:16px 0 4px;text-align:center;">Not enough history yet.</div>`;
      }
      const W = 284, H = 84, pad = 6;
      const sorted = [...points].sort((a, b) => a.ts - b.ts);
      const pcts = sorted.map(p => p.percent);
      const min = Math.min(...pcts) - 1, max = Math.max(...pcts) + 1;
      const span = max - min || 1;
      const pts = sorted.map((p, i) => {
        const x = pad + (i / (sorted.length - 1)) * (W - pad * 2);
        const y = pad + (1 - (p.percent - min) / span) * (H - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      const [lx, ly] = pts[pts.length - 1].split(',');
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;margin-top:12px;">
        <polyline points="${pts.join(' ')}" fill="none" stroke="${theme.text}" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${lx}" cy="${ly}" r="3" fill="${theme.text}" />
      </svg>`;
    }

    // ── Render panel ──────────────────────────────────────────────────────────
    async function renderPanel() {
      const t = theme;
      const [data, changes, announcements, watch] = await Promise.all([
        loadGradeData(), loadChanges(), loadCachedAnnouncements(), loadWatchStatus(),
      ]);
      const courses = data?.courses ?? [];
      const pcts = courses.map(c => parseGradeString(c.grade).percent).filter((p): p is number => p !== null);
      const avg = pcts.length ? pcts.reduce((s,p) => s+p, 0)/pcts.length : null;
      const count = courses.length;

      const deduped = dedupeChanges(changes, 8);

      const shownAnn = announcements.slice(0, 8);

      // Selected course for the graph
      if (!selectedCourse || !courses.some(c => c.name === selectedCourse)) {
        selectedCourse = courses[0]?.name ?? null;
      }
      const selCourse = courses.find(c => c.name === selectedCourse) ?? null;

      const sectionLabel = (txt: string) =>
        `<div style="font-size:11px;font-weight:600;letter-spacing:0.04em;color:${t.muted};margin:28px 2px 10px;text-transform:uppercase;">${txt}</div>`;

      const row = (e: ChangeEvent, last: boolean) => {
        const title = e.kind === 'grade' ? esc(e.course) : esc(e.name);
        const sub = e.kind === 'grade' ? `${e.oldPct?.toFixed(1)} → ${e.newPct?.toFixed(1)}% · ${ago(e.ts)}`
          : e.kind === 'graded' ? `Graded · ${esc(e.course)} · ${ago(e.ts)}`
          : `New · ${esc(e.course)} · ${ago(e.ts)}`;
        const endColor = e.kind === 'grade' ? (e.delta >= 0 ? t.fresh : t.failed) : t.text;
        const end = e.kind === 'grade' ? `${e.delta >= 0 ? '+' : ''}${e.delta.toFixed(1)}%`
          : e.kind === 'graded' && e.pct !== null ? `${e.pct.toFixed(0)}%` : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:13px 16px;${last?'':'border-bottom:1px solid '+t.border};">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:500;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
            <div style="font-size:11px;color:${t.muted};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sub}</div>
          </div>
          ${end ? `<span style="font-size:13px;font-weight:600;color:${endColor};flex-shrink:0;font-variant-numeric:tabular-nums;">${end}</span>` : ''}
        </div>`;
      };

      const annRow = (a: typeof shownAnn[number], last: boolean) => {
        const safeLink = safeExternalUrl(a.link);
        return `<div data-link="${esc(safeLink ?? '')}" class="bs-ann-row" style="padding:13px 16px;${last?'':'border-bottom:1px solid '+t.border};${safeLink?'cursor:pointer;':''}">
          <div style="display:flex;align-items:baseline;gap:8px;">
            <span style="font-size:13px;font-weight:500;color:${t.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(a.author || 'Schoology')}</span>
            <span style="flex:1;"></span>
            <span style="font-size:10px;color:${t.muted};flex-shrink:0;">${esc(a.timeText || ago(a.timestamp))}</span>
          </div>
          <div style="font-size:11px;color:${t.muted};margin-top:4px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(a.courseName ? `${a.courseName} — ${a.body}` : a.body)}</div>
        </div>`;
      };

      // Watcher health banner
      const watchBanner = (watch && !watch.ok) ? `
        <div style="margin-top:18px;padding:12px 14px;border-radius:14px;background:${t.failed}1f;display:flex;gap:9px;align-items:flex-start;">
          <span style="color:${t.failed};font-weight:600;">·</span>
          <div style="font-size:11px;color:${t.text};line-height:1.5;">
            ${watch.reason === 'session'
              ? 'Grades couldn’t refresh — your Schoology session expired. Open Schoology and sign in.'
              : watch.reason === 'network'
                ? 'Couldn’t reach Schoology just now. It’ll retry shortly.'
                : 'Couldn’t read your grades this time. It’ll retry shortly.'}
          </div>
        </div>` : '';

      // Grade-over-time section
      const courseTabs = courses.map(c => {
        const active = c.name === selCourse?.name;
        const label = c.name.length > 16 ? c.name.slice(0, 16) + '…' : c.name;
        return `<button class="bs-course-tab" data-course="${esc(c.name)}" style="all:unset;cursor:pointer;font-size:11px;white-space:nowrap;padding-bottom:5px;flex-shrink:0;font-weight:${active?'600':'400'};color:${active?t.text:t.muted};border-bottom:2px solid ${active?t.text:'transparent'};">${esc(label)}</button>`;
      }).join('');

      const graphSection = courses.length > 0 && selCourse ? `
        ${sectionLabel('Grade over time')}
        <div style="display:flex;gap:16px;overflow-x:auto;padding:0 2px 2px;margin-bottom:12px;">${courseTabs}</div>
        <div style="border-radius:16px;background:${t.card};padding:16px 16px 12px;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;">
            <span style="font-size:13px;font-weight:500;color:${t.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(selCourse.name)}</span>
            <span style="font-size:13px;font-weight:600;color:${t.text};font-variant-numeric:tabular-nums;flex-shrink:0;">${parseGradeString(selCourse.grade).percent?.toFixed(1) ?? '—'}%</span>
          </div>
          ${trendSvg(computeSemesterTrend(selCourse))}
        </div>` : '';

      panel.innerHTML = `
        <div style="padding:28px 18px 48px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.05em;color:${t.muted};">Better SGY</span>
            <button id="bs-close" style="all:unset;cursor:pointer;font-size:18px;color:${t.muted};line-height:1;padding:4px 6px;">✕</button>
          </div>
          <div style="padding:0 2px;">
            <div style="font-size:48px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-variant-numeric:tabular-nums;color:${t.text};">
              ${avg !== null ? avg.toFixed(1) : '—'}<span style="font-size:22px;font-weight:500;color:${t.muted};">${avg !== null ? '%' : ''}</span>
            </div>
            <div style="font-size:12px;color:${t.muted};margin-top:8px;">Overall average · ${count} course${count===1?'':'s'}${watch ? ` · checked ${ago(watch.ts)}` : ''}</div>
          </div>

          ${watchBanner}

          ${sectionLabel('Recent activity')}
          <div style="border-radius:16px;overflow:hidden;background:${t.card};">
            ${deduped.length
              ? deduped.map((e,i) => row(e, i===deduped.length-1)).join('')
              : `<div style="padding:22px 16px;font-size:13px;color:${t.muted};text-align:center;line-height:1.5;">Nothing yet — visit Schoology to load grades.</div>`
            }
          </div>

          ${graphSection}

          ${sectionLabel('Updates')}
          <div style="border-radius:16px;overflow:hidden;background:${t.card};">
            ${shownAnn.length
              ? shownAnn.map((a,i) => annRow(a, i===shownAnn.length-1)).join('')
              : `<div style="padding:22px 16px;font-size:13px;color:${t.muted};text-align:center;line-height:1.5;">No updates cached yet.</div>`
            }
          </div>
        </div>`;

      document.getElementById('bs-close')?.addEventListener('click', close);
      panel.querySelectorAll<HTMLElement>('.bs-course-tab').forEach(el => {
        el.addEventListener('click', () => { selectedCourse = el.dataset.course ?? null; void renderPanel(); });
      });
      panel.querySelectorAll<HTMLElement>('.bs-ann-row').forEach(el => {
        const link = el.dataset.link;
        if (link) el.addEventListener('click', () => openSafe(link));
      });
    }

    // ── Theme ─────────────────────────────────────────────────────────────────
    async function loadTheme() {
      const res = await browser.storage.local.get('bs_theme_sync');
      const th = res.bs_theme_sync as Partial<typeof theme> | undefined;
      if (th) {
        theme = { ...theme, ...th };
        btn.style.background = theme.bg;
        btn.style.color = theme.text;
        panel.style.background = theme.bg;
        panel.style.color = theme.text;
        if (isOpen) void renderPanel();
      }
    }

    // ── Auto-open on new background updates ────────────────────────────────────
    // When the watcher writes a fresh change to storage, pop the panel open so the
    // update is right there — no clicking, even on another tab.
    let lastSeenTs = 0;
    let primed = false;
    let autoOpenOn = true;
    void loadSettings().then((s) => { autoOpenOn = s.notifications; });

    const newestTs = (events: { ts: number }[]) => events.reduce((m, e) => Math.max(m, e.ts || 0), 0);

    async function checkAutoOpen() {
      const changes = await loadChanges();
      const top = newestTs(changes);
      if (primed && autoOpenOn && top > lastSeenTs && !isOpen) {
        chime();
        open();
        btn.style.transform = 'scale(1.12)';
        setTimeout(() => { btn.style.transform = 'none'; }, 240);
      }
      lastSeenTs = Math.max(lastSeenTs, top);
    }

    // Prime the baseline so pre-existing history doesn't pop the panel on load.
    void loadChanges().then((c) => { lastSeenTs = newestTs(c); primed = true; });

    // ── Init ──────────────────────────────────────────────────────────────────
    void renderBtn();
    void loadTheme();
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      void loadTheme();
      void renderBtn();
      if (changes.bs_settings) void loadSettings().then((s) => { chimeOn = s.chime; autoOpenOn = s.notifications; });
      if (changes.bs_grade_changes) void checkAutoOpen();
    });
  },
});
