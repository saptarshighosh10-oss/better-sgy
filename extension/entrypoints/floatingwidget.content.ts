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
      halo:    { bg: '#eef5ff', text: '#1c2c40', card: '#ffffff', border: 'rgba(74,127,208,0.12)',    primary: '#4a7fd0', fresh: '#34c759', failed: '#ff6b6b', muted: '#6e87a6' },
      slate:   { bg: '#ffffff', text: '#1a1a1a', card: '#f3f3f1', border: 'rgba(0,0,0,0.12)',        primary: '#1a1a1a', fresh: '#2f7d32', failed: '#b00020', muted: '#6b6b6b' },
      forge:   { bg: '#241c16', text: '#f5ece1', card: '#322820', border: 'rgba(255,255,255,0.09)',  primary: '#e07a3c', fresh: '#5cb85c', failed: '#e5533c', muted: 'rgba(245,236,225,0.5)' },
      carbon:  { bg: '#1f150d', text: '#f3e9da', card: '#241a12', border: 'rgba(255,255,255,0.08)',  primary: '#d68a3c', fresh: '#8fae6b', failed: '#c96a4e', muted: '#8a7860' },
    };
    // Labels for the in-panel picker (Forge ships under the friendlier name).
    const LOOK_LABELS: Record<string, string> = { apple: 'Apple', halo: 'Halo', slate: 'Slate', forge: 'Friendly', carbon: 'Carbon' };
    // Per-look IDENTITY (beyond color): the card takes on each edition's character —
    // Apple/Cloud get an iPhone-soft rounded edge + SF type, Slate a serif newspaper
    // masthead, Friendly a rounded chatty face, Carbon a serif walnut feel.
    type LookId = { font: string; radius: number; eyebrow: string; soft: boolean; badge: string };
    const LOOK_ID: Record<string, LookId> = {
      default: { font: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", radius: 16, eyebrow: 'Better SGY', soft: false, badge: 'SGY' },
      apple:   { font: "-apple-system,'SF Pro Display','SF Pro Text','Helvetica Neue',sans-serif", radius: 22, eyebrow: 'Better SGY', soft: true, badge: 'SGY' },
      halo:    { font: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif", radius: 24, eyebrow: 'Cloud', soft: true, badge: '☁' },
      slate:   { font: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,'Times New Roman',serif", radius: 3, eyebrow: 'THE GRADE REVIEW', soft: false, badge: 'SGY' },
      forge:   { font: "'SF Pro Rounded','Hiragino Maru Gothic ProN','Nunito',-apple-system,sans-serif", radius: 20, eyebrow: 'hey 👋', soft: false, badge: '☺' },
      carbon:  { font: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif", radius: 13, eyebrow: 'Better SGY', soft: false, badge: 'SGY' },
    };
    let curLook = 'default';
    const lookId = () => LOOK_ID[curLook] ?? LOOK_ID.default;
    // Per-look brand SYMBOL for the card badge (drawn in the badge's ink color via
    // currentColor) — Cloud is a cloud, Carbon a carbon ring, Slate a newspaper,
    // Friendly a smiley, Apple an apple; default is the SGY chevron mark.
    const LOOK_ICON: Record<string, string> = {
      default: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16l7-9 7 9"/></svg>`,
      apple:   `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 13.5c0 3.2-2.1 6-3.9 6-.9 0-1.3-.5-2.1-.5s-1.2.5-2.1.5C7.1 19.5 5 16.7 5 13.5 5 11 6.9 9.4 8.8 9.4c1 0 1.7.6 2.2.6s1.1-.6 2.2-.6c1.9 0 3.8 1.6 3.8 4.1z"/><path d="M13.2 8.2c.7-.8 1-1.9.9-2.9-1 .1-2 .7-2.6 1.5-.6.7-1 1.8-.8 2.8 1 .1 2-.5 2.5-1.4z"/></svg>`,
      halo:    `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7.5 18A4.5 4.5 0 0 1 7 9.1a5.5 5.5 0 0 1 10.5 1.2A3.6 3.6 0 0 1 17 18H7.5z"/></svg>`,
      slate:   `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="1.4"/><path d="M7 9h6M7 12h6M7 15h4"/><rect x="15" y="9" width="3.2" height="6" rx=".5"/></svg>`,
      forge:   `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M8.2 14.2a4.2 4.2 0 0 0 7.6 0" stroke-linecap="round"/><circle cx="9" cy="10" r="1.05" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.05" fill="currentColor" stroke="none"/></svg>`,
      carbon:  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3.6l7.3 4.2v8.4L12 20.4l-7.3-4.2V7.8z"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/><circle cx="12" cy="3.6" r="1.4" fill="currentColor" stroke="none"/><circle cx="19.3" cy="16.2" r="1.4" fill="currentColor" stroke="none"/><circle cx="4.7" cy="16.2" r="1.4" fill="currentColor" stroke="none"/></svg>`,
    };
    const lookIcon = () => LOOK_ICON[curLook] ?? LOOK_ICON.default;
    let theme: CardTheme = { ...CARD_THEMES.default };

    // ── Per-look SKIN — the visual "material" each look adopts from its mockup ──
    // These describe surface/material, corner radii, header treatment, row styling,
    // accent shapes and shadows so the card faithfully matches its portable-widget
    // MOCKUP. The render* helpers below branch off `curLook` via skin().
    type Skin = {
      // panel surface
      panelBg: string;            // background (may be gradient/blur paint)
      panelBackdrop: string;      // backdrop-filter (frosted looks)
      panelBorderL: string;       // leading-edge border treatment
      panelShadow: string;        // panel drop shadow
      // pill (button)
      pillRadius: string;
      pillBg: string;
      pillBackdrop: string;
      pillShadow: string;
      pillBorder: string;         // box-shadow ring used as a border
      markBg: string;             // mark/badge background paint
      markRadius: string;
      markColor: string;          // ink color inside the mark
      // cards / rows
      cardRadius: string;
      cardBg: string;
      cardBorder: string;         // CSS border for cards (or 'none')
      cardShadow: string;
      rowStripe: boolean;         // colored leading stripe per activity row
      // hero
      heroNumColor: string;
      // misc
      eyebrowTransform: string;   // text-transform for eyebrow/section labels
    };
    function skin(): Skin {
      const t = theme;
      switch (curLook) {
        case 'apple':
          return {
            panelBg: 'rgba(255,255,255,0.86)',
            panelBackdrop: 'saturate(180%) blur(28px)',
            panelBorderL: '1px solid rgba(0,0,0,0.08)',
            panelShadow: '-12px 0 50px rgba(0,0,0,0.22)',
            pillRadius: '980px',
            pillBg: '#ffffff',
            pillBackdrop: 'none',
            pillShadow: '0 1px 2px rgba(0,0,0,0.05),0 10px 34px rgba(0,0,0,0.16)',
            pillBorder: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
            markBg: 'linear-gradient(150deg,#0071e3,#5b6cff)',
            markRadius: '9px',
            markColor: '#ffffff',
            cardRadius: '18px',
            cardBg: '#ffffff',
            cardBorder: '1px solid rgba(0,0,0,0.045)',
            cardShadow: '0 1px 2px rgba(0,0,0,0.03),0 6px 20px rgba(0,0,0,0.04)',
            rowStripe: true,
            heroNumColor: t.text,
            eyebrowTransform: 'uppercase',
          };
        case 'slate':
          return {
            panelBg: '#ffffff',
            panelBackdrop: 'none',
            panelBorderL: '3px solid #000',
            panelShadow: '-8px 0 0 #000, -10px 0 30px rgba(0,0,0,0.18)',
            pillRadius: '0px',
            pillBg: '#ffffff',
            pillBackdrop: 'none',
            pillShadow: '5px 5px 0 #000',
            pillBorder: 'inset 0 0 0 2px #000',
            markBg: '#000000',
            markRadius: '0px',
            markColor: '#ffffff',
            cardRadius: '0px',
            cardBg: '#ffffff',
            cardBorder: '1px solid #000',
            cardShadow: 'none',
            rowStripe: false,
            heroNumColor: t.text,
            eyebrowTransform: 'uppercase',
          };
        case 'forge':
          return {
            panelBg: `${t.bg} radial-gradient(circle at 12% 4%,rgba(255,180,84,0.12),transparent 42%),radial-gradient(circle at 96% 0%,rgba(155,135,242,0.10),transparent 40%)`,
            panelBackdrop: 'none',
            panelBorderL: '1.5px solid #ece0cd',
            panelShadow: '-18px 0 60px rgba(80,50,15,0.32)',
            pillRadius: '30px',
            pillBg: '#fffdf9',
            pillBackdrop: 'none',
            pillShadow: '0 14px 34px -14px rgba(120,80,30,0.55),0 3px 0 rgba(214,140,70,0.16)',
            pillBorder: 'inset 0 0 0 1.5px #ece0cd',
            markBg: 'radial-gradient(circle at 35% 30%,#ffd98a,#ff9d5c)',
            markRadius: '50%',
            markColor: '#ffffff',
            cardRadius: '16px',
            cardBg: '#fffdf9',
            cardBorder: '1.5px solid #ece0cd',
            cardShadow: '0 6px 16px -16px rgba(120,80,30,0.5)',
            rowStripe: true,
            heroNumColor: t.text,
            eyebrowTransform: 'lowercase',
          };
        case 'carbon':
          // Woody walnut + honey-amber, fully rounded, organic. Leaves added separately.
          return {
            panelBg: `${t.bg} radial-gradient(circle at 14% 6%,rgba(214,138,60,0.14),transparent 44%),radial-gradient(circle at 92% 2%,rgba(143,174,107,0.10),transparent 40%)`,
            panelBackdrop: 'none',
            panelBorderL: '1.5px solid rgba(214,138,60,0.28)',
            panelShadow: '-18px 0 60px rgba(40,24,8,0.45)',
            pillRadius: '999px',
            pillBg: 'linear-gradient(160deg,#2a1d12,#241a12)',
            pillBackdrop: 'none',
            pillShadow: '0 14px 34px -12px rgba(20,12,4,0.65),0 3px 0 rgba(143,174,107,0.18)',
            pillBorder: 'inset 0 0 0 1.5px rgba(214,138,60,0.3)',
            markBg: 'radial-gradient(circle at 35% 30%,#f0b566,#d68a3c)',
            markRadius: '50%',
            markColor: '#241a12',
            cardRadius: '20px',
            cardBg: '#2a1d12',
            cardBorder: '1.5px solid rgba(214,138,60,0.18)',
            cardShadow: '0 8px 22px -16px rgba(20,12,4,0.7)',
            rowStripe: false,
            heroNumColor: t.text,
            eyebrowTransform: 'none',
          };
        case 'halo': // Cloud — soft sky + clouds, airy and rounded
          return {
            panelBg: 'rgba(243,248,255,0.9)',
            panelBackdrop: 'saturate(160%) blur(26px)',
            panelBorderL: '1px solid rgba(74,127,208,0.14)',
            panelShadow: '-14px 0 54px rgba(74,127,208,0.2)',
            pillRadius: '999px',
            pillBg: 'rgba(255,255,255,0.92)',
            pillBackdrop: 'saturate(160%) blur(16px)',
            pillShadow: '0 2px 10px rgba(74,127,208,0.16),0 14px 34px -10px rgba(74,127,208,0.28)',
            pillBorder: 'inset 0 0 0 1px rgba(74,127,208,0.12)',
            markBg: 'linear-gradient(160deg,#8fd0f5,#4a7fd0)',
            markRadius: '12px',
            markColor: '#ffffff',
            cardRadius: '20px',
            cardBg: '#ffffff',
            cardBorder: '1px solid rgba(74,127,208,0.10)',
            cardShadow: '0 2px 10px rgba(74,127,208,0.10)',
            rowStripe: true,
            heroNumColor: '#4a7fd0',
            eyebrowTransform: 'none',
          };
        default: // 'default' fallback
          return {
            panelBg: t.bg,
            panelBackdrop: 'none',
            panelBorderL: 'none',
            panelShadow: '-4px 0 32px rgba(0,0,0,0.3)',
            pillRadius: lookId().radius + 'px',
            pillBg: t.bg,
            pillBackdrop: 'none',
            pillShadow: '0 6px 28px rgba(0,0,0,0.5),0 0 0 1.5px rgba(255,255,255,0.1)',
            pillBorder: 'none',
            markBg: t.primary || t.text,
            markRadius: curLook === 'halo' ? '11px' : '9px',
            markColor: t.bg,
            cardRadius: '16px',
            cardBg: t.card,
            cardBorder: 'none',
            cardShadow: 'none',
            rowStripe: false,
            heroNumColor: t.text,
            eyebrowTransform: 'uppercase',
          };
      }
    }

    // A stable per-course accent color for the activity-row stripe (Apple/Forge).
    const ROW_ACCENTS = ['#5b6cff', '#34c759', '#ff9f0a', '#bf5af2', '#0a84ff', '#30d158'];
    const accentFor = (key: string) => {
      let h = 0;
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
      return ROW_ACCENTS[h % ROW_ACCENTS.length];
    };

    // Carbon's signature: small leaves sprouting from the top edge of a surface,
    // each with a slightly different sway phase/base tilt so they don't move in
    // lockstep. Returns an absolutely-positioned overlay (parent must be relative).
    function carbonLeavesHtml(): string {
      if (curLook !== 'carbon') return '';
      const leaf = (cx: number, base: number, delay: number, scale: number, dark: boolean) => {
        const fill = dark ? '#6f8f4e' : '#8fae6b';
        return `<span class="bs-leaf" style="position:absolute;left:${cx}px;top:-13px;width:18px;height:20px;--leaf-base:${base}deg;animation-delay:${delay}s;transform:scale(${scale});">
          <svg viewBox="0 0 24 28" width="18" height="20" style="display:block;overflow:visible;">
            <path d="M12 28 C2 18 2 6 12 0 C22 6 22 18 12 28 Z" fill="${fill}"/>
            <path d="M12 26 L12 4" stroke="rgba(40,24,8,0.35)" stroke-width="1" fill="none"/>
          </svg>
        </span>`;
      };
      return `<div aria-hidden="true" style="position:absolute;left:14px;right:14px;top:0;height:0;pointer-events:none;z-index:1;">
        ${leaf(8, -18, 0, 0.9, false)}
        ${leaf(34, 6, 0.7, 1, true)}
        ${leaf(58, -8, 1.4, 0.85, false)}
      </div>`;
    }

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
    // Hover/press lift. Shadow tracks the current look's skin (set in loadTheme),
    // so we don't clobber it with the dark-default ring; we just lift on hover.
    const restShadow = () => { const s = skin(); return s.pillBorder === 'none' ? s.pillShadow : `${s.pillShadow},${s.pillBorder}`; };
    btn.onmouseenter = () => { btn.style.transform = 'translateY(-3px) scale(1.03)'; };
    btn.onmouseleave = () => { btn.style.transform = 'none'; btn.style.boxShadow = restShadow(); };
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
    // Also: Carbon's leaf-sway keyframes — a gentle, continuous sine-like wiggle so
    // the leaves sprouting from the card edge sway like they're in a light breeze.
    const skelStyle = document.createElement('style');
    skelStyle.textContent = `
      @keyframes bsSkelFW { 0% { background-position:-180% 0; } 100% { background-position:180% 0; } }
      .bs-skel-fw {
        border-radius: 8px;
        background-image: linear-gradient(90deg, rgba(128,128,128,0) 0%, rgba(128,128,128,0.16) 20%, rgba(128,128,128,0.28) 50%, rgba(128,128,128,0.16) 80%, rgba(128,128,128,0) 100%);
        background-size: 180% 100%; background-repeat: no-repeat;
        opacity: 0.55; animation: bsSkelFW 1.4s ease-in-out infinite;
      }
      @keyframes bsLeafSway {
        0%   { transform: rotate(var(--leaf-base,0deg)); }
        25%  { transform: rotate(calc(var(--leaf-base,0deg) + 7deg)); }
        50%  { transform: rotate(var(--leaf-base,0deg)); }
        75%  { transform: rotate(calc(var(--leaf-base,0deg) - 6deg)); }
        100% { transform: rotate(var(--leaf-base,0deg)); }
      }
      .bs-leaf { transform-origin: 50% 100%; animation: bsLeafSway 4.2s ease-in-out infinite; will-change: transform; }
      @media (prefers-reduced-motion: reduce) { .bs-leaf { animation: none; } }`;
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
      const s = skin();

      // Small delta chip (▲/▼) shown only when there's a recent grade move.
      const deltaChip = latest ? `
        <span style="display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:700;line-height:1;
          color:${latest.delta>=0?theme.fresh:theme.failed};">
          ${latest.delta>=0?'▲':'▼'}${Math.abs(latest.delta).toFixed(1)}
        </span>` : '';

      // Slate divides mark from text with a thin rule and uppercases the label.
      const slate = curLook === 'slate';
      const gradesLabel = slate ? 'GRADES' : (curLook === 'forge' ? 'grades' : 'GRADES');

      btn.innerHTML = `
        ${carbonLeavesHtml()}
        <span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;
          border-radius:${s.markRadius};background:${s.markBg};color:${s.markColor};box-shadow:${slate?'none':'0 1px 2px rgba(0,0,0,.14)'};">
          ${lookIcon()}
        </span>
        ${slate ? `<span style="width:1px;align-self:stretch;background:rgba(0,0,0,0.15);margin:2px 0;"></span>` : ''}
        <span style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;line-height:1;">
          <span style="font-size:18px;font-weight:750;font-variant-numeric:tabular-nums;line-height:1;color:${theme.text};">
            ${avg !== null ? avg.toFixed(1)+'%' : '—'}
          </span>
          <span style="display:flex;align-items:center;gap:5px;">
            <span style="font-size:9px;font-weight:600;letter-spacing:${slate?'0.16em':'0.05em'};text-transform:${s.eyebrowTransform};color:${theme.muted};line-height:1;">${gradesLabel}</span>
            ${deltaChip}
          </span>
        </span>
        ${hasDrop ? `<span style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;background:${theme.failed};border:2.5px solid ${theme.bg};z-index:2;"></span>` : ''}
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

    const sectionLabelHtml = (txt: string) => {
      const tr = skin().eyebrowTransform;
      const shown = tr === 'lowercase' ? txt.toLowerCase() : txt;
      return `<div style="font-size:11px;font-weight:${curLook==='slate'||curLook==='forge'?'700':'600'};letter-spacing:${curLook==='slate'?'0.2em':'0.04em'};color:${theme.muted};margin:28px 2px 10px;text-transform:${tr};">${shown}</div>`;
    };

    // Big overall-average number + "checked N ago" subtitle at the top of the panel.
    // Per-look: Slate is a serif masthead with a kicker + italic %, Forge wraps the
    // number in a cream card with an "on track" tag, Carbon a warm walnut figure,
    // Apple/default a clean large number.
    function renderHeroHtml(avg: number | null, count: number, watch: Watch): string {
      const t = theme;
      const s = skin();
      const numStr = avg !== null ? avg.toFixed(1) : '—';
      const sub = `Overall average · ${count} course${count===1?'':'s'}${watch ? ` · checked ${ago(watch.ts)}` : ''}`;
      const closeBtn = `<button id="bs-close" style="all:unset;cursor:pointer;font-size:18px;color:${t.muted};line-height:1;padding:4px 6px;">✕</button>`;

      if (curLook === 'slate') {
        return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:12px;border-bottom:3px solid #000;">
              <span style="font-family:inherit;font-weight:700;font-size:24px;letter-spacing:-0.025em;color:${t.text};">${esc(lookId().eyebrow)}</span>
              <button id="bs-close" style="all:unset;cursor:pointer;font-family:inherit;font-size:24px;color:${t.muted};line-height:1;">✕</button>
            </div>
            <div style="padding:0 2px 16px;border-bottom:1px solid #000;margin-bottom:6px;">
              <span style="display:block;font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${t.muted};margin-bottom:8px;">Overall Average</span>
              <div style="font-weight:700;font-size:72px;line-height:0.84;letter-spacing:-0.04em;font-variant-numeric:tabular-nums;color:${t.text};">
                ${numStr}<span style="font-size:0.28em;font-weight:400;font-style:italic;color:${t.muted};margin-left:0.08em;">${avg!==null?'%':''}</span>
              </div>
              <div style="font-style:italic;font-size:13px;line-height:1.5;color:${t.text};margin-top:13px;">${sub}</div>
            </div>`;
      }

      if (curLook === 'forge') {
        return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
              <span style="font-size:13px;font-weight:800;color:${t.text};">${esc(lookId().eyebrow)}</span>
              ${closeBtn}
            </div>
            <div style="position:relative;background:${s.cardBg};border:${s.cardBorder};border-radius:20px;padding:16px 18px;box-shadow:${s.cardShadow};">
              <span style="position:absolute;top:-10px;right:14px;background:${t.fresh};color:#fff;font-size:11px;font-weight:800;padding:3px 11px;border-radius:18px;box-shadow:0 5px 12px -3px rgba(79,178,134,0.55);transform:rotate(3deg);">on track ✶</span>
              <div style="font-size:46px;font-weight:800;line-height:1;letter-spacing:-0.03em;color:${t.text};">
                ${numStr}<span style="font-size:20px;color:${t.muted};">${avg!==null?'%':''}</span>
              </div>
              <div style="font-size:12.5px;color:${t.muted};font-weight:700;margin-top:6px;">${sub}</div>
            </div>`;
      }

      if (curLook === 'carbon') {
        return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
              <span style="font-size:11px;font-weight:600;letter-spacing:0.05em;color:${t.muted};">${esc(lookId().eyebrow)}</span>
              ${closeBtn}
            </div>
            <div style="position:relative;background:${s.cardBg};border:${s.cardBorder};border-radius:24px;padding:18px 20px;box-shadow:${s.cardShadow};overflow:visible;">
              ${carbonLeavesHtml()}
              <div style="font-size:48px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-variant-numeric:tabular-nums;color:${t.text};">
                ${numStr}<span style="font-size:22px;font-weight:500;color:${t.muted};">${avg!==null?'%':''}</span>
              </div>
              <div style="font-size:12px;color:${t.muted};margin-top:8px;">${sub}</div>
            </div>`;
      }

      // Apple / Cloud / default
      return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
            <span style="font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:${s.eyebrowTransform};color:${t.muted};">${esc(lookId().eyebrow)}</span>
            ${closeBtn}
          </div>
          <div style="padding:0 2px;">
            <div style="font-size:${curLook==='apple'?'58px':'48px'};font-weight:${curLook==='apple'?'600':'700'};letter-spacing:-0.03em;line-height:1;font-variant-numeric:tabular-nums;color:${s.heroNumColor};">
              ${numStr}<span style="font-size:22px;font-weight:500;color:${t.muted};">${avg !== null ? '%' : ''}</span>
            </div>
            <div style="font-size:12px;color:${t.muted};margin-top:8px;">${sub}</div>
          </div>`;
    }

    // One row in the "Recent activity" list (grade move / graded / new item).
    // Styling adopts the active look's mockup: Apple/Forge get a colored leading
    // stripe (and Forge a soft emoji-ish dot), Slate renders ruled serif "briefs"
    // with a black "New" tag, the rest stay clean.
    function renderActivityRowHtml(e: ChangeEvent, last: boolean): string {
      const t = theme;
      const s = skin();
      const courseKey = e.kind === 'grade' ? e.course : e.course;
      const accent = accentFor(courseKey);
      const title = e.kind === 'grade' ? esc(e.course) : esc(e.name);
      const sub = e.kind === 'grade' ? `${e.oldPct?.toFixed(1)} → ${e.newPct?.toFixed(1)}% · ${ago(e.ts)}`
        : e.kind === 'graded' ? `Graded · ${esc(e.course)} · ${ago(e.ts)}`
        : `New · ${esc(e.course)} · ${ago(e.ts)}`;
      const endColor = e.kind === 'grade' ? (e.delta >= 0 ? t.fresh : t.failed) : t.text;
      const isNew = e.kind === 'new-assignment';
      const end = e.kind === 'grade' ? `${e.delta >= 0 ? '+' : ''}${e.delta.toFixed(1)}%`
        : e.kind === 'graded' && e.pct !== null ? `${e.pct.toFixed(0)}%` : '';

      // ── Slate: ruled serif "brief" ──
      if (curLook === 'slate') {
        const endHtml = isNew
          ? `<span style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;border:1px solid #000;background:#000;color:#fff;padding:3px 7px 2px;line-height:1.2;">New</span>`
          : end ? `<span style="font-family:inherit;font-weight:700;font-size:15px;color:${endColor};font-variant-numeric:tabular-nums;">${end}</span>` : '';
        return `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:12px 16px;${last?'':'border-bottom:1px solid rgba(0,0,0,0.15)'};">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:15px;line-height:1.2;letter-spacing:-0.01em;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10.5px;letter-spacing:0.03em;color:${t.muted};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sub}</div>
            </div>
            ${endHtml ? `<div style="flex-shrink:0;text-align:right;white-space:nowrap;">${endHtml}</div>` : ''}
          </div>`;
      }

      // ── Apple / Forge / Carbon: leading colored stripe ──
      const stripe = s.rowStripe || curLook === 'carbon'
        ? `<span style="width:3px;align-self:stretch;border-radius:3px;flex-shrink:0;background:${accent};"></span>`
        : '';
      const endHtml = isNew
        ? `<span style="font-size:11px;font-weight:600;color:${theme.primary};background:${theme.primary}1a;border-radius:999px;padding:3px 9px;flex-shrink:0;">New</span>`
        : end ? `<span style="font-size:13px;font-weight:600;color:${endColor};flex-shrink:0;font-variant-numeric:tabular-nums;">${end}</span>` : '';
      return `<div style="display:flex;align-items:center;gap:12px;padding:13px 16px;${last?'':'border-bottom:1px solid '+t.border};">
          ${stripe}
          <div style="flex:1;min-width:0;">
            <div style="font-size:${curLook==='forge'?'13.5px':'14px'};font-weight:${curLook==='forge'?'800':'500'};letter-spacing:-0.01em;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
            <div style="font-size:11px;color:${t.muted};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sub}</div>
          </div>
          ${endHtml}
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
      const s = skin();
      const border = s.cardBorder === 'none' ? '' : `border:${s.cardBorder};`;
      const shadow = s.cardShadow === 'none' ? '' : `box-shadow:${s.cardShadow};`;
      return `
        ${sectionLabelHtml('Grade over time')}
        <div style="display:flex;gap:16px;overflow-x:auto;padding:0 2px 2px;margin-bottom:12px;">${courseTabs}</div>
        <div style="border-radius:${s.cardRadius};background:${s.cardBg};${border}${shadow}padding:16px 16px 12px;">
          <div style="display:flex;align-items:baseline;justify-content:space-between;">
            <span style="font-size:13px;font-weight:${curLook==='slate'||curLook==='forge'?'700':'500'};color:${t.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(selCourse.name)}</span>
            <span style="font-size:13px;font-weight:700;color:${t.text};font-variant-numeric:tabular-nums;flex-shrink:0;">${parseGradeString(selCourse.grade).percent?.toFixed(1) ?? '—'}%</span>
          </div>
          ${trendSvg(computeSemesterTrend(selCourse))}
        </div>`;
    }

    // A "card" list: rows when non-empty, otherwise a centered hint. Surface
    // (radius/border/shadow) follows the active look's skin so the card matches
    // its mockup — Apple's soft white tile, Slate's hard black box, Forge's cream
    // card, Carbon's rounded walnut panel.
    function renderListCardHtml(rowsHtml: string, emptyText: string): string {
      const t = theme;
      const s = skin();
      const body = rowsHtml || `<div style="padding:22px 16px;font-size:13px;color:${t.muted};text-align:center;line-height:1.5;">${emptyText}</div>`;
      const border = s.cardBorder === 'none' ? '' : `border:${s.cardBorder};`;
      const shadow = s.cardShadow === 'none' ? '' : `box-shadow:${s.cardShadow};`;
      return `<div style="border-radius:${s.cardRadius};overflow:hidden;background:${s.cardBg};${border}${shadow}">${body}</div>`;
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
      curLook = look;
      theme = { ...CARD_THEMES[look] ?? CARD_THEMES.default };
      const id = lookId();
      const s = skin();
      // ── Pill (button) surface, per the look's mockup material ──
      btn.style.background = s.pillBg;
      btn.style.color = theme.text;
      btn.style.fontFamily = id.font;
      btn.style.borderRadius = s.pillRadius;
      btn.style.boxShadow = s.pillBorder === 'none' ? s.pillShadow : `${s.pillShadow},${s.pillBorder}`;
      (btn.style as CSSStyleDeclaration).backdropFilter = s.pillBackdrop;
      (btn.style as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter = s.pillBackdrop;
      // Carbon's leaves sprout past the pill edge, so it can't clip its overflow.
      btn.style.overflow = curLook === 'carbon' ? 'visible' : 'hidden';
      // ── Panel surface ──
      panel.style.background = s.panelBg;
      panel.style.color = theme.text;
      panel.style.fontFamily = id.font;
      panel.style.boxShadow = s.panelShadow;
      (panel.style as CSSStyleDeclaration).backdropFilter = s.panelBackdrop;
      (panel.style as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter = s.panelBackdrop;
      panel.style.borderLeft = s.panelBorderL === 'none' ? '' : s.panelBorderL;
      // Apple/Cloud round the panel's leading edge like a phone; Carbon rounds it
      // organically; Slate stays hard-square; the rest stay square.
      const panelLeadRadius = curLook === 'carbon' ? '26px' : (id.soft ? '26px' : '0px');
      panel.style.borderTopLeftRadius = panel.style.borderBottomLeftRadius = panelLeadRadius;
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
