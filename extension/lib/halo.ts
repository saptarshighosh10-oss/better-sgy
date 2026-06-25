/**
 * halo.ts — design language for the Halo edition (Apple-Store-inspired) overlay.
 *
 * Halo keeps using the existing theme system (T / accents) for *color*,
 * and layers a refined type scale, spacing, radii and surfaces on top so
 * every page reads the same. Pure-grayscale ("Mono / B&W") is just the mono accent
 * + a mono theme — see isMono() in theme.ts; the helpers here drop shadows/chroma
 * accordingly. Nothing here is page-specific; pages compose these tokens.
 */
import { isLightTheme, getActiveTheme } from './theme';

/** San Francisco on Apple platforms, Inter elsewhere, system fallback last. */
export const HALO_FONT =
  "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, 'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Apple type scale (px) + the letter-spacing / weight pairings Apple uses. */
export const AT = {
  font: HALO_FONT,
  // sizes
  hero: 80,
  display: 56,
  h1: 40,
  h2: 32,
  h3: 21,
  body: 17,
  sub: 15,
  caption: 13,
  micro: 12,
  // weights (Apple leans semibold for headings, regular for body)
  semibold: 600,
  medium: 500,
  regular: 400,
  // tracking
  trackTight: '-0.035em',
  trackHead: '-0.022em',
  trackBody: '-0.01em',
  // radii
  rPill: 980,
  rCard: 22,
  rCardLg: 28,
  rTile: 18,
  rChip: 12,
} as const;

/** Quiet secondary surface (Apple's #f5f5f7 band), adapted per theme. */
export function tileBg(): string {
  const t = getActiveTheme();
  if (t === 'mono-light') return '#f5f5f7';
  if (t === 'mono-dark') return '#1c1c1e';
  return '#141a2b'; // navy "original"
}

/** Hairline divider — Apple uses ~0.08–0.12α rules, not heavy borders. */
export function hairline(): string {
  return isLightTheme() ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)';
}

/** Card shadow: soft on light surfaces; dark themes lean on borders instead. */
export function cardShadow(elevated = false): string {
  if (isLightTheme()) {
    return elevated ? '0 8px 30px rgba(0,0,0,0.10)' : '0 4px 22px rgba(0,0,0,0.06)';
  }
  return elevated ? '0 12px 40px rgba(0,0,0,0.55)' : 'none';
}
