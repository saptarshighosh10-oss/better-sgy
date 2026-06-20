/**
 * halo-ui.tsx — small shared building blocks for the Halo edition overlay.
 * Pages compose these so the type scale, pills, tiles and section headers stay
 * identical everywhere. Colors come from the theme (T); see lib/halo.ts.
 */
import React from 'react';
import { T, inkOnAccent } from '../lib/theme';
import { AT, tileBg, hairline, cardShadow } from '../lib/halo';

/** Pill CTA — Apple's filled blue button (uses the active accent). */
export function HaloButton({
  children, onClick, variant = 'filled', size = 'md', title, ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'filled' | 'tinted' | 'plain';
  size?: 'sm' | 'md';
  title?: string;
  ariaLabel?: string;
}) {
  const pad = size === 'sm' ? '8px 16px' : '11px 22px';
  const fs = size === 'sm' ? AT.sub : AT.body;
  const base: React.CSSProperties = {
    all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: AT.font, fontSize: fs, fontWeight: AT.regular, letterSpacing: AT.trackBody,
    padding: pad, borderRadius: AT.rPill, lineHeight: 1, whiteSpace: 'nowrap',
  };
  const styles: Record<string, React.CSSProperties> = {
    filled: { ...base, background: T.primary, color: inkOnAccent() },
    tinted: { ...base, background: T.primary + '1f', color: T.primary },
    plain: { ...base, background: 'transparent', color: T.primary, padding: size === 'sm' ? '8px 8px' : '11px 10px' },
  };
  return (
    <button type="button" onClick={onClick} title={title} aria-label={ariaLabel}
      className="bs-focusable bs-press" style={styles[variant]}>
      {children}
    </button>
  );
}

/** Text link with the Apple chevron, e.g. "View grades ›". */
export function HaloLink({
  children, onClick, size = AT.sub, ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: number;
  ariaLabel?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel}
      className="bs-focusable bs-applink"
      style={{
        all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'baseline', gap: 3,
        fontFamily: AT.font, fontSize: size, fontWeight: AT.regular, letterSpacing: AT.trackBody,
        color: T.primary,
      }}>
      <span>{children}</span>
      <span aria-hidden="true" style={{ fontWeight: AT.regular }}>›</span>
    </button>
  );
}

/** Quiet stat tile on the secondary surface (Apple "feature tile"). */
export function FeatureTile({
  label, value, note, valueColor, valueSize = AT.h1,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  valueColor?: string;
  valueSize?: number;
}) {
  return (
    <div style={{
      background: tileBg(), borderRadius: AT.rTile, padding: '20px 22px',
      minHeight: 132, display: 'flex', flexDirection: 'column', fontFamily: AT.font,
    }}>
      <div style={{ fontSize: AT.sub, color: T.muted, letterSpacing: AT.trackBody }}>{label}</div>
      <div style={{
        marginTop: 'auto', fontSize: valueSize, fontWeight: AT.semibold,
        letterSpacing: AT.trackHead, lineHeight: 1, color: valueColor ?? T.text,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      {note && (
        <div style={{ marginTop: 8, fontSize: AT.caption, color: T.muted, opacity: 0.85, letterSpacing: AT.trackBody }}>
          {note}
        </div>
      )}
    </div>
  );
}

/** Section header row: big sentence-case title + quiet meta on the right. */
export function SectionHeader({
  title, meta, action,
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, fontFamily: AT.font }}>
      <h2 style={{ margin: 0, fontSize: AT.h2, fontWeight: AT.semibold, letterSpacing: AT.trackHead, color: T.text }}>
        {title}
      </h2>
      {action ?? (meta && (
        <span style={{ fontSize: AT.body, color: T.muted, letterSpacing: AT.trackBody }}>{meta}</span>
      ))}
    </div>
  );
}

/** Small eyebrow label above a hero (sentence case, not the old uppercase tic). */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: AT.font, fontSize: AT.h3, fontWeight: AT.semibold, color: T.muted, letterSpacing: AT.trackBody }}>
      {children}
    </div>
  );
}

/** Raised content card (white surface on light, bordered on dark). */
export function haloCardStyle(elevated = false): React.CSSProperties {
  return {
    background: T.card,
    border: `1px solid ${hairline()}`,
    borderRadius: AT.rCardLg,
    boxShadow: cardShadow(elevated),
    fontFamily: AT.font,
  };
}
