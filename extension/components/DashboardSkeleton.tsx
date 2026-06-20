import React from 'react';
import { T } from '../lib/theme';
import { AT, hairline } from '../lib/apple';
import { appleCardStyle } from './apple-ui';

/** One shimmer block — reuses the global .bs-skel class. */
function Skel({ w, h, r, style }: { w: number | string; h: number; r?: number; style?: React.CSSProperties }) {
  return <div className="bs-skel" style={{ width: w, height: h, borderRadius: r ?? 8, color: T.text, ...style }} />;
}

/**
 * Skeleton mirror of OverviewPage shown while the first scrape resolves —
 * hero average, four feature tiles, and a grid of course cards.
 */
export function DashboardSkeleton() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: T.bg, fontFamily: AT.font }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px clamp(20px, 4vw, 40px) 96px' }}>
        {/* Hero */}
        <Skel w={120} h={14} />
        <Skel w={220} h={72} r={14} style={{ marginTop: 18 }} />
        <Skel w={280} h={16} style={{ marginTop: 18 }} />

        {/* Feature tiles */}
        <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...appleCardStyle(), padding: '20px 22px' }}>
              <Skel w="55%" h={11} />
              <Skel w="70%" h={30} style={{ marginTop: 16 }} />
              <Skel w="45%" h={11} style={{ marginTop: 14 }} />
            </div>
          ))}
        </div>

        {/* Section header */}
        <Skel w={140} h={22} style={{ marginTop: 56 }} />

        {/* Course cards */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ ...appleCardStyle(), padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Skel w="60%" h={16} />
                <Skel w={48} h={24} r={8} />
              </div>
              <Skel w="40%" h={12} style={{ marginTop: 12 }} />
              <Skel w="100%" h={40} r={10} style={{ marginTop: 20 }} />
              <div style={{ borderTop: `1px solid ${hairline()}`, marginTop: 18, paddingTop: 14 }}>
                <Skel w="50%" h={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
