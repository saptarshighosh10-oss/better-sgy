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

    // ── Card palettes, one per "look" ──────────────────────────────────────────
    // The card follows the look you chose in the chooser (chrome.storage
    // 'bsgy-edition') by default; an explicit override ('bsgy-card-look') wins
    // when set. Both persist. See loadTheme()/resolveLook() below.
    type CardTheme = { bg: string; text: string; card: string; border: string; primary: string; fresh: string; failed: string; muted: string };
    const CARD_THEMES: Record<string, CardTheme> = {
      default: { bg: '#0e0e12', text: '#f5f5f7', card: '#1c1c1e', border: 'rgba(255,255,255,0.1)',  primary: '#3b82f6', fresh: '#34c759', failed: '#ff3b30', muted: 'rgba(235,235,245,0.45)' },
      apple:   { bg: '#ffffff', text: '#1d1d1f', card: '#f5f5f7', border: 'rgba(0,0,0,0.08)',        primary: '#0a84ff', fresh: '#34c759', failed: '#ff3b30', muted: '#6e6e73' },
      halo:    { bg: '#0e1413', text: '#e8efed', card: '#16201d', border: 'rgba(255,255,255,0.09)',  primary: '#16a394', fresh: '#34c759', failed: '#ff6b6b', muted: 'rgba(232,239,237,0.5)' },
      slate:   { bg: '#ffffff', text: '#1a1a1a', card: '#f3f3f1', border: 'rgba(0,0,0,0.12)',        primary: '#1a1a1a', fresh: '#2f7d32', failed: '#b00020', muted: '#6b6b6b' },
      forge:   { bg: '#241c16', text: '#f5ece1', card: '#322820', border: 'rgba(255,255,255,0.09)',  primary: '#e07a3c', fresh: '#5cb85c', failed: '#e5533c', muted: 'rgba(245,236,225,0.5)' },
      carbon:  { bg: '#1f150d', text: '#f3e9da', card: '#241a12', border: 'rgba(255,255,255,0.08)',  primary: '#d68a3c', fresh: '#8fae6b', failed: '#c96a4e', muted: '#8a7860' },
    };
    // Labels for the in-panel picker (Forge ships under the friendlier name).
    const LOOK_LABELS: Record<string, string> = { apple: 'Apple', halo: 'Halo', slate: 'Slate', forge: 'Friendly', carbon: 'Carbon' };
    let theme: CardTheme = { ...CARD_THEMES.default };

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

    // ── Drag-to-place anywhere (position persists in chrome.storage) ────────────
    // A press that moves past a small threshold is a drag (and is NOT treated as a
    // click); anything shorter still opens the panel. Position is clamped to the
    // viewport on drop and on resize so the card can never end up off-screen.
    let dragStart: { x: number; y: number; left: number; top: number } | null = null;
    let dragMoved = false;
    const DRAG_THRESH = 5;
    function placeAt(left: number, top: number) {
      const w = btn.offsetWidth || 108, h = btn.offsetHeight || 56;
      const L = Math.max(6, Math.min(window.innerWidth - w - 6, left));
      const Tp = Math.max(6, Math.min(window.innerHeight - h - 6, top));
      btn.style.left = L + 'px'; btn.style.top = Tp + 'px';
      btn.style.right = 'auto'; btn.style.bottom = 'auto';
      return { left: L, top: Tp };
    }
    async function restorePos() {
      const r = await browser.storage.local.get('bsgy-card-pos');
      const pos = r['bsgy-card-pos'] as { left: number; top: number } | undefined;
      if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') placeAt(pos.left, pos.top);
    }
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const rect = btn.getBoundingClientRect();
      dragStart = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
      dragMoved = false;
      try { btn.setPointerCapture(e.pointerId); } catch {}
    });
    btn.addEventListener('pointermove', (e) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
      if (!dragMoved && Math.hypot(dx, dy) < DRAG_THRESH) return;
      dragMoved = true;
      btn.style.transition = 'none';
      btn.style.transform = 'none';
      placeAt(dragStart.left + dx, dragStart.top + dy);
    });
    btn.addEventListener('pointerup', (e) => {
      try { btn.releasePointerCapture(e.pointerId); } catch {}
      btn.style.transition = '';
      if (dragMoved) {
        const rect = btn.getBoundingClientRect();
        void browser.storage.local.set({ 'bsgy-card-pos': { left: rect.left, top: rect.top } });
      }
      dragStart = null;
    });
    window.addEventListener('resize', () => {
      if (btn.style.left) { const rect = btn.getBoundingClientRect(); placeAt(rect.left, rect.top); }
    });

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

    btn.onclick = () => {
      if (dragMoved) { dragMoved = false; return; } // just finished a drag — don't open
      chime(); isOpen ? close() : open();
    };

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

    // ── Panel HTML pieces ───────────────────────────────────────────────────
    // Each helper returns a self-contained HTML fragment so that renderPanel()
    // below reads as a top-to-bottom composition of named sections. They close
    // over `theme` (via the `t` alias), `esc`, and `ago`.

    type Course = NonNullable<Awaited<ReturnType<typeof loadGradeData>>>['courses'][number];
    type Announcement = Awaited<ReturnType<typeof loadCachedAnnouncements>>[number];
    type Watch = Awaited<ReturnType<typeof loadWatchStatus>>;

    const sectionLabelHtml = (txt: string) =>
      `<div style="font-size:11px;font-weight:600;letter-spacing:0.04em;color:${theme.muted};margin:28px 2px 10px;text-transform:uppercase;">${txt}</div>`;

    // Big overall-average number + "checked N ago" subtitle at the top of the panel.
    function renderHeroHtml(avg: number | null, count: number, watch: Watch): string {
      const t = theme;
      return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.05em;color:${t.muted};">Better SGY</span>
            <button id="bs-close" style="all:unset;cursor:pointer;font-size:18px;color:${t.muted};line-height:1;padding:4px 6px;">✕</button>
          </div>
          <div style="padding:0 2px;">
            <div style="font-size:48px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-variant-numeric:tabular-nums;color:${t.text};">
              ${avg !== null ? avg.toFixed(1) : '—'}<span style="font-size:22px;font-weight:500;color:${t.muted};">${avg !== null ? '%' : ''}</span>
            </div>
            <div style="font-size:12px;color:${t.muted};margin-top:8px;">Overall average · ${count} course${count===1?'':'s'}${watch ? ` · checked ${ago(watch.ts)}` : ''}</div>
          </div>`;
    }

    // One row in the "Recent activity" list (grade move / graded / new item).
    function renderActivityRowHtml(e: ChangeEvent, last: boolean): string {
      const t = theme;
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
    }

    // One row in the "Updates" list. data-link is sanitized — click wiring lives
    // in renderPanel and only fires openSafe() when a safe link is present.
    function renderAnnouncementRowHtml(a: Announcement, last: boolean): string {
      const t = theme;
      const safeLink = safeExternalUrl(a.link);
      return `<div data-link="${esc(safeLink ?? '')}" class="bs-ann-row" style="padding:13px 16px;${last?'':'border-bottom:1px solid '+t.border};${safeLink?'cursor:pointer;':''}">
          <div style="display:flex;align-items:baseline;gap:8px;">
            <span style="font-size:13px;font-weight:500;color:${t.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(a.author || 'Schoology')}</span>
            <span style="flex:1;"></span>
            <span style="font-size:10px;color:${t.muted};flex-shrink:0;">${esc(a.timeText || ago(a.timestamp))}</span>
          </div>
          <div style="font-size:11px;color:${t.muted};margin-top:4px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(a.courseName ? `${a.courseName} — ${a.body}` : a.body)}</div>
        </div>`;
    }

    // Watcher-health banner: only renders when the last refresh failed.
    function renderWatchBannerHtml(watch: Watch): string {
      const t = theme;
      if (!(watch && !watch.ok)) return '';
      return `
        <div style="margin-top:18px;padding:12px 14px;border-radius:14px;background:${t.failed}1f;display:flex;gap:9px;align-items:flex-start;">
          <span style="color:${t.failed};font-weight:600;">·</span>
          <div style="font-size:11px;color:${t.text};line-height:1.5;">
            ${watch.reason === 'session'
              ? 'Grades couldn’t refresh — your Schoology session expired. Open Schoology and sign in.'
              : watch.reason === 'network'
                ? 'Couldn’t reach Schoology just now. It’ll retry shortly.'
                : 'Couldn’t read your grades this time. It’ll retry shortly.'}
          </div>
        </div>`;
    }

    // "Grade over time" section: course tabs + the selected course's sparkline.
    function renderGraphSectionHtml(courses: Course[], selCourse: Course | null): string {
      const t = theme;
      if (!(courses.length > 0 && selCourse)) return '';
      const courseTabs = courses.map(c => {
        const active = c.name === selCourse.name;
        const label = c.name.length > 16 ? c.name.slice(0, 16) + '…' : c.name;
        return `<button class="bs-course-tab" data-course="${esc(c.name)}" style="all:unset;cursor:pointer;font-size:11px;white-space:nowrap;padding-bottom:5px;flex-shrink:0;font-weight:${active?'600':'400'};color:${active?t.text:t.muted};border-bottom:2px solid ${active?t.text:'transparent'};">${esc(label)}</button>`;
      }).join('');
      return `
        ${sectionLabelHtml('Grade over time')}
        <div style="display:flex;gap:16px;overflow-x:auto;padding:0 2px 2px;margin-bottom:12px;">${courseTabs}</div>
        <div style="border-radius:16px;background:${t.card};padding:16px 16px 12px;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;">
            <span style="font-size:13px;font-weight:500;color:${t.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(selCourse.name)}</span>
            <span style="font-size:13px;font-weight:600;color:${t.text};font-variant-numeric:tabular-nums;flex-shrink:0;">${parseGradeString(selCourse.grade).percent?.toFixed(1) ?? '—'}%</span>
          </div>
          ${trendSvg(computeSemesterTrend(selCourse))}
        </div>`;
    }

    // A rounded "card" list: rows when non-empty, otherwise a centered hint.
    function renderListCardHtml(rowsHtml: string, emptyText: string): string {
      const t = theme;
      const body = rowsHtml || `<div style="padding:22px 16px;font-size:13px;color:${t.muted};text-align:center;line-height:1.5;">${emptyText}</div>`;
      return `<div style="border-radius:16px;overflow:hidden;background:${t.card};">${body}</div>`;
    }

    // "Card look" picker: a "Match site" pill + one swatch per look. Selecting a
    // swatch sets the override ('bsgy-card-look'); "Match site" clears it so the
    // card tracks your chosen edition again. Both persist in chrome.storage.
    function renderCardLookHtml(activeLook: string, matching: boolean): string {
      const t = theme;
      const swatches = ['apple', 'halo', 'slate', 'forge', 'carbon'].map((id) => {
        const p = CARD_THEMES[id];
        const on = !matching && activeLook === id;
        return `<button class="bs-look" data-look="${id}" title="${LOOK_LABELS[id]}" style="all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;">
            <span style="width:30px;height:30px;border-radius:9px;background:${p.bg};box-sizing:border-box;border:2px solid ${on ? t.primary : t.border};box-shadow:inset 0 0 0 3px ${p.primary};"></span>
            <span style="font-size:9px;font-weight:${on ? '600' : '400'};color:${on ? t.text : t.muted};">${LOOK_LABELS[id]}</span>
          </button>`;
      }).join('');
      const matchPill = `<button class="bs-look-match" style="all:unset;cursor:pointer;font-size:11px;font-weight:${matching ? '600' : '400'};padding:5px 11px;border-radius:999px;border:1px solid ${matching ? t.primary : t.border};color:${matching ? t.text : t.muted};">Match site</button>`;
      return `${sectionLabelHtml('Card look')}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          ${matchPill}
          <span style="font-size:10px;color:${t.muted};">${matching ? 'follows your chosen look' : 'custom override'}</span>
        </div>
        <div style="display:flex;gap:12px;overflow-x:auto;padding:2px 2px 4px;">${swatches}</div>`;
    }

    // ── Render panel ──────────────────────────────────────────────────────────
    async function renderPanel() {
      const [data, changes, announcements, watch, lookState] = await Promise.all([
        loadGradeData(), loadChanges(), loadCachedAnnouncements(), loadWatchStatus(), resolveLook(),
      ]);
      const courses = data?.courses ?? [];
      const pcts = courses.map(c => parseGradeString(c.grade).percent).filter((p): p is number => p !== null);
      const avg = pcts.length ? pcts.reduce((s,p) => s+p, 0)/pcts.length : null;
      const count = courses.length;

      const deduped = dedupeChanges(changes, 8);
      const shownAnn = announcements.slice(0, 8);

      // Selected course for the graph — fall back to the first course if the
      // previously selected one is gone.
      if (!selectedCourse || !courses.some(c => c.name === selectedCourse)) {
        selectedCourse = courses[0]?.name ?? null;
      }
      const selCourse = courses.find(c => c.name === selectedCourse) ?? null;

      const activityHtml = deduped.map((e,i) => renderActivityRowHtml(e, i===deduped.length-1)).join('');
      const updatesHtml = shownAnn.map((a,i) => renderAnnouncementRowHtml(a, i===shownAnn.length-1)).join('');

      panel.innerHTML = `
        <div style="padding:28px 18px 48px;">
          ${renderHeroHtml(avg, count, watch)}

          ${renderWatchBannerHtml(watch)}

          ${sectionLabelHtml('Recent activity')}
          ${renderListCardHtml(activityHtml, 'Nothing yet — visit Schoology to load grades.')}

          ${renderGraphSectionHtml(courses, selCourse)}

          ${sectionLabelHtml('Updates')}
          ${renderListCardHtml(updatesHtml, 'No updates cached yet.')}

          ${renderCardLookHtml(lookState.look, lookState.matching)}
        </div>`;

      // ── Event wiring (rebuilt every render, since innerHTML replaces nodes) ──
      document.getElementById('bs-close')?.addEventListener('click', close);
      // Card-look picker: set/clear the override, then re-theme + re-render.
      panel.querySelectorAll<HTMLElement>('.bs-look').forEach(el => {
        el.addEventListener('click', () => {
          void browser.storage.local.set({ 'bsgy-card-look': el.dataset.look ?? '' }).then(loadTheme);
        });
      });
      panel.querySelector<HTMLElement>('.bs-look-match')?.addEventListener('click', () => {
        void browser.storage.local.remove('bsgy-card-look').then(loadTheme);
      });
      panel.querySelectorAll<HTMLElement>('.bs-course-tab').forEach(el => {
        el.addEventListener('click', () => { selectedCourse = el.dataset.course ?? null; void renderPanel(); });
      });
      panel.querySelectorAll<HTMLElement>('.bs-ann-row').forEach(el => {
        const link = el.dataset.link;
        if (link) el.addEventListener('click', () => openSafe(link));
      });
    }

    // ── Theme (follows the chosen look, with an optional override) ──────────────
    // Effective look = 'bsgy-card-look' (override) → 'bsgy-edition' (site look) →
    // 'default'. `matching` is true when no override is set (card tracks the site).
    async function resolveLook(): Promise<{ look: string; matching: boolean; site: string }> {
      const r = await browser.storage.local.get(['bsgy-card-look', 'bsgy-edition']);
      const override = typeof r['bsgy-card-look'] === 'string' ? r['bsgy-card-look'].trim().toLowerCase() : '';
      const site = typeof r['bsgy-edition'] === 'string' ? r['bsgy-edition'].trim().toLowerCase() : '';
      if (override && CARD_THEMES[override]) return { look: override, matching: false, site };
      if (site && CARD_THEMES[site]) return { look: site, matching: true, site };
      return { look: 'default', matching: true, site };
    }

    async function loadTheme() {
      const { look } = await resolveLook();
      theme = { ...CARD_THEMES[look] ?? CARD_THEMES.default };
      btn.style.background = theme.bg;
      btn.style.color = theme.text;
      panel.style.background = theme.bg;
      panel.style.color = theme.text;
      void renderBtn();
      if (isOpen) void renderPanel();
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
    void restorePos();
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      void loadTheme();
      void renderBtn();
      if (changes.bs_settings) void loadSettings().then((s) => { chimeOn = s.chime; autoOpenOn = s.notifications; });
      if (changes.bs_grade_changes) void checkAutoOpen();
    });
  },
});
