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

export function courseColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
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
