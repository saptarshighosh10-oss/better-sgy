import { getActiveTheme } from './theme';

const PALETTE = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#ec4899', // pink
];

const MONO_BG_PALETTE = [
  '#2a2a2a', // dark gray 1
  '#333333', // dark gray 2
  '#3d3d3d', // dark gray 3
  '#363636', // dark gray 4
  '#2d2d2d', // dark gray 5
  '#313131', // dark gray 6
];

const MONO_TEXT_PALETTE = [
  '#faf9f6', // cream-white
  '#e4e4e7', // zinc 200
  '#d4d4d8', // zinc 300
  '#a1a1aa', // zinc 400
  '#f4f4f5', // zinc 100
  '#e2e2e5',
];

const MONO_LIGHT_BG_PALETTE = [
  '#e9e7e2', // warm gray 1
  '#e2e0db', // warm gray 2
  '#dcdad5', // warm gray 3
  '#e6e4df', // warm gray 4
  '#dfddd8', // warm gray 5
  '#e4e2dd', // warm gray 6
];

const MONO_LIGHT_TEXT_PALETTE = [
  '#1a1a1a',
  '#2a2a2a',
  '#3a3a3a',
  '#4a4a4a',
  '#2e2e2e',
  '#383838',
];

export function courseColor(name: string, isText = false): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  }
  const theme = getActiveTheme();
  if (theme === 'mono-dark') {
    const palette = isText ? MONO_TEXT_PALETTE : MONO_BG_PALETTE;
    return palette[h % palette.length];
  }
  if (theme === 'mono-light') {
    const palette = isText ? MONO_LIGHT_TEXT_PALETTE : MONO_LIGHT_BG_PALETTE;
    return palette[h % palette.length];
  }
  return PALETTE[h % PALETTE.length];
}

export function courseAbbr(name: string): string {
  const n = name.toLowerCase();
  const num = name.match(/\d+/)?.[0] ?? '';
  if (/algebra|trig/.test(n)) return num ? `ALG ${num}` : 'ALG';
  if (/biology/.test(n)) return 'BIO';
  if (/lit|writ|english/.test(n)) return 'LIT';
  if (/french/.test(n)) return num ? `FR ${num}` : 'FR';
  if (/^pe\b|physical/.test(n)) return num ? `PE ${num}` : 'PE';
  if (/drama|theatre/.test(n)) return 'DRA';
  if (/chemistry/.test(n)) return 'CHEM';
  if (/history|social/.test(n)) return 'HIST';
  if (/music/.test(n)) return 'MUS';
  if (/art/.test(n)) return 'ART';
  return name.split(/[\s/]/)[0].slice(0, 5).toUpperCase();
}

export function abbrFontSize(abbr: string): number {
  const n = abbr.replace(/\s/g, '').length;
  if (n <= 2) return 64;
  if (n === 3) return 50;
  if (n === 4) return 40;
  return 32;
}
