export type Theme = 'original' | 'mono-dark' | 'mono-light';

export const THEME_ORDER: Theme[] = ['original', 'mono-dark', 'mono-light'];

export const THEME_LABELS: Record<Theme, string> = {
  original: 'Navy',
  'mono-dark': 'Mono Black',
  'mono-light': 'Mono White',
};

const THEME_KEY = '__bs_theme__';

function loadStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'original';
  const t = localStorage.getItem(THEME_KEY);
  return t === 'mono-dark' || t === 'mono-light' || t === 'original' ? t : 'original';
}

let currentTheme: Theme = loadStoredTheme();

export function getActiveTheme(): Theme {
  return currentTheme;
}

/** Light-background theme? Course-band overlays flip to ink text. */
export function isLightTheme(): boolean {
  return currentTheme === 'mono-light';
}

/**
 * Readable ink for text/icons sitting ON the accent (T.primary) color.
 * Contrasts against the *resolved* primary, not the raw accent — because
 * mono-light remaps pale accents (cream/sky/mint) to near-black ink. So a
 * cream accent on the light theme yields a dark button → needs white text;
 * the same cream accent on a dark theme stays cream → needs dark text.
 * Fixes both "white-on-white blob" and "black-on-black box".
 */
export function inkOnAccent(): string {
  const hex = String((THEMES[currentTheme] as ThemeColors).primary).replace('#', '');
  if (hex.length < 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? '#1a1a1a' : '#ffffff';
}

// Subscribers notified on any theme OR accent change (e.g. the quiz iframe
// re-skinning itself live when the student switches theme mid-attempt).
const themeListeners = new Set<() => void>();

export function onThemeChange(fn: () => void): () => void {
  themeListeners.add(fn);
  return () => themeListeners.delete(fn);
}

function notifyThemeChange() {
  themeListeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  if (typeof (window as any).__triggerThemeChange === 'function') {
    (window as any).__triggerThemeChange();
  }
}

export function setTheme(t: Theme) {
  currentTheme = t;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(THEME_KEY, t);
  }
  notifyThemeChange();
}

export function cycleTheme(): Theme {
  const i = THEME_ORDER.indexOf(currentTheme);
  const next = THEME_ORDER[(i + 1) % THEME_ORDER.length];
  setTheme(next);
  return next;
}

/**
 * Compatibility export — snapshot of the theme at content-script load.
 * Fine for per-page-load constants (game emoji, etc.); use getActiveTheme()
 * anywhere that must react to a live theme switch.
 */
export const ACTIVE_THEME: Theme = currentTheme;

export interface ThemeColors {
  text: string;
  muted: string;
  faint: string;
  card: string;
  border: string;
  rowBorder: string;
  primary: string;
  bg: string;
  green: string;
  red: string;
  amber: string;
  activeBg: string;
  activeBorder: string;
  panel: string;
  today: string;
  folder: string;
  link: string;
  doc: string;
  assign: string;
  discussion: string;
  // Aliases for compatibility
  header: string;
  sidebar: string;
  fresh: string;
  stale: string;
  failed: string;
  accent: string;
}

export const ACCENT_PRESETS = {
  cream: '#faf9f6',
  blue: '#3b82f6',
  lavender: '#c084fc',
  mint: '#34d399',
  sky: '#38bdf8',
  rose: '#fb7185',
  gold: '#fbbf24',
} as const;

let currentAccent = (typeof localStorage !== 'undefined' ? localStorage.getItem('__bs_custom_accent__') : null) ||
  (currentTheme === 'mono-dark' ? '#faf9f6' : '#3b82f6');

export function getAccentColor(): string {
  return currentAccent;
}

export function setAccentColor(color: string) {
  currentAccent = color;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('__bs_custom_accent__', color);
  }
  notifyThemeChange();
}

/**
 * Accent adapted for the mono-light (white) theme. Pale accents (cream, sky, mint,
 * gold, lavender…) have almost no contrast on white. The old behavior flattened
 * the worst offenders to near-black — which is why "some accents turned black."
 * Instead we DARKEN the accent while preserving its hue + saturation (equal-channel
 * scaling only lowers lightness), so the color still reads as itself — just deep
 * enough to be visible on white. Already-dark accents (e.g. blue) pass through
 * unchanged, and custom accents are handled too.
 */
function inkAccent(): string {
  const a = getAccentColor();
  const hex = a.replace('#', '');
  if (hex.length < 6) return a;
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return a;
  // Perceived luminance; ceiling chosen for good contrast on white.
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const MAX = 120;
  if (lum > MAX) {
    const f = MAX / lum;
    r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
  }
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export const ORIGINAL_THEME: ThemeColors = {
  text: '#e8eaf0',
  muted: '#7a8ea3',
  faint: '#2a3a52',
  card: '#111827',
  border: '#1e2535',
  rowBorder: '#151d2e',
  get primary() { return getAccentColor(); },
  get accent() { return getAccentColor(); },
  bg: '#0d1019',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  activeBg: '#1a2540',
  get activeBorder() { return getAccentColor(); },
  panel: '#0e1120',
  today: '#1a2540',
  folder: '#f59e0b',
  link: '#06b6d4',
  doc: '#8b5cf6',
  assign: '#10b981',
  discussion: '#ec4899',
  header: '#0a0c11',
  sidebar: '#0d0f14',
  fresh: '#22c55e',
  stale: '#f59e0b',
  failed: '#ef4444',
};

export const MONO_DARK_THEME: ThemeColors = {
  text: '#faf9f6',
  muted: '#a0a0a0',
  faint: '#2e2e2e',
  card: '#242424',
  border: 'rgba(250, 249, 246, 0.14)',
  rowBorder: 'rgba(250, 249, 246, 0.08)',
  get primary() { return getAccentColor(); },
  bg: '#1a1a1a',
  get green() { return getAccentColor(); },
  get red() { return getAccentColor(); },
  get amber() { return getAccentColor(); },
  activeBg: '#2e2e2e',
  get activeBorder() { return getAccentColor(); },
  panel: '#1a1a1a',
  today: '#2e2e2e',
  get folder() { return getAccentColor(); },
  get link() { return getAccentColor(); },
  get doc() { return getAccentColor(); },
  get assign() { return getAccentColor(); },
  get discussion() { return getAccentColor(); },
  header: '#1a1a1a',
  sidebar: '#1a1a1a',
  get fresh() { return getAccentColor(); },
  get stale() { return getAccentColor(); },
  get failed() { return getAccentColor(); },
  get accent() { return getAccentColor(); },
};

// Mirrors the dashboard's .mono-light palette (app/globals.css)
export const MONO_LIGHT_THEME: ThemeColors = {
  text: '#1a1a1a',
  muted: '#6b6b6b',
  faint: '#d8d6d0',
  card: '#ffffff',
  border: 'rgba(26, 26, 26, 0.25)',
  rowBorder: 'rgba(26, 26, 26, 0.14)',
  get primary() { return inkAccent(); },
  bg: '#faf9f6',
  get green() { return inkAccent(); },
  get red() { return inkAccent(); },
  get amber() { return inkAccent(); },
  activeBg: '#f0efec',
  get activeBorder() { return inkAccent(); },
  panel: '#faf9f6',
  today: '#f0efec',
  get folder() { return inkAccent(); },
  get link() { return inkAccent(); },
  get doc() { return inkAccent(); },
  get assign() { return inkAccent(); },
  get discussion() { return inkAccent(); },
  header: '#faf9f6',
  sidebar: '#faf9f6',
  get fresh() { return inkAccent(); },
  get stale() { return inkAccent(); },
  get failed() { return inkAccent(); },
  get accent() { return inkAccent(); },
};

const THEMES: Record<Theme, ThemeColors> = {
  original: ORIGINAL_THEME,
  'mono-dark': MONO_DARK_THEME,
  'mono-light': MONO_LIGHT_THEME,
};

/**
 * Live theme object — every property read resolves against the currently
 * selected theme, so a re-render after setTheme() repaints everything.
 */
export const T: ThemeColors = new Proxy({} as ThemeColors, {
  get(_, key: string) {
    return (THEMES[currentTheme] as any)[key];
  },
});
