/**
 * Primitives.tsx — Redesign v2 shared primitives.
 *
 * Skeleton (shimmer) + EmptyState, straight from the v2 spec:
 *   - elevation = surface + 1px border, never a shadow
 *   - skeleton shimmer honors prefers-reduced-motion (falls back to flat tint)
 *   - empty states: icon tile on accent-12, 16/700 title, 13 muted body
 * Class styles live in GlobalStyles (bs2-* classes).
 */

import React from 'react';
import { T } from '../lib/theme';

export function SkeletonLine({ width = '100%', height = 11, style }: {
  width?: number | string;
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="bs2-skel"
      aria-hidden="true"
      style={{ display: 'block', width, height, borderRadius: 6, ...style }}
    />
  );
}

/** A row of skeleton lines shaped like a list row (avatar dot + two lines + number). */
export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 14px', borderBottom: `1px solid ${T.rowBorder}` }}>
      <span className="bs2-skel" aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'block' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <SkeletonLine width="42%" />
        <SkeletonLine width="26%" height={9} />
      </div>
      <SkeletonLine width={54} height={13} />
    </div>
  );
}

export function SkeletonList({ rows = 5, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={`${label}…`} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{label}…</span>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div role="status" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '64px 32px', gap: 8,
    }}>
      <div aria-hidden="true" style={{
        width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center',
        background: `${T.primary}1f`, color: T.primary, marginBottom: 10,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
      {text && <div style={{ fontSize: 13, color: T.muted, maxWidth: 340, lineHeight: 1.55 }}>{text}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
