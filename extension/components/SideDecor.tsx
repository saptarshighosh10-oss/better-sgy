import React from 'react';
import { T } from '../lib/theme';

interface Shape {
  left?: string;
  right?: string;
  top: string;
  w: number;
  h: number;
  r: number;
  color: string;
  dur: number;
  delay: number;
  radius: number;
}

/**
 * Ambient decoration for the empty side gutters of centered pages. Fixed,
 * pointer-events-none, low z-index so it never blocks content (and it only sits in
 * the margins anyway). Two moods:
 *   'arcade' → floating colored "bricks" (matches Grade Breaker)
 *   'calm'   → soft outlined shapes (matches the Nostalgia timeline)
 */
export function SideDecor({ variant }: { variant: 'arcade' | 'calm' }) {
  const arcade = variant === 'arcade';

  const shapes: Shape[] = arcade
    ? [
        { left: '4%', top: '16%', w: 46, h: 18, r: -8, color: T.primary, dur: 7, delay: 0, radius: 5 },
        { left: '9%', top: '37%', w: 38, h: 16, r: 7, color: T.green, dur: 9, delay: 1.4, radius: 5 },
        { left: '3%', top: '60%', w: 50, h: 18, r: -5, color: T.amber, dur: 8, delay: 0.7, radius: 5 },
        { left: '8%', top: '80%', w: 34, h: 14, r: 10, color: T.red, dur: 10, delay: 2.1, radius: 5 },
        { right: '4%', top: '22%', w: 40, h: 16, r: 8, color: T.green, dur: 8, delay: 0.9, radius: 5 },
        { right: '9%', top: '46%', w: 48, h: 18, r: -7, color: T.primary, dur: 9, delay: 2.0, radius: 5 },
        { right: '3%', top: '68%', w: 36, h: 15, r: 5, color: T.red, dur: 7, delay: 0.3, radius: 5 },
        { right: '8%', top: '86%', w: 44, h: 17, r: -10, color: T.amber, dur: 11, delay: 1.7, radius: 5 },
      ]
    : [
        { left: '6%', top: '24%', w: 84, h: 84, r: 12, color: T.border, dur: 10, delay: 0, radius: 20 },
        { left: '10%', top: '60%', w: 56, h: 56, r: -8, color: T.border, dur: 12, delay: 1.5, radius: 50 },
        { right: '7%', top: '30%', w: 70, h: 70, r: -10, color: T.border, dur: 11, delay: 0.8, radius: 50 },
        { right: '9%', top: '68%', w: 92, h: 92, r: 6, color: T.border, dur: 13, delay: 2.0, radius: 22 },
      ];

  return (
    <div className="bs-decor" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Soft accent glows anchored in the gutters */}
      <div style={{ position: 'absolute', left: '-7%', top: arcade ? '34%' : '14%', width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, ${T.primary}1f, transparent 70%)`, filter: 'blur(26px)' }} />
      <div style={{ position: 'absolute', right: '-7%', bottom: '8%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${T.primary}18, transparent 70%)`, filter: 'blur(26px)' }} />

      {shapes.map((s, i) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          ...(s.left ? { left: s.left } : { right: s.right }),
          top: s.top,
          width: s.w,
          height: s.h,
          borderRadius: s.radius,
          background: arcade ? s.color : 'transparent',
          border: arcade ? 'none' : `1.5px solid ${s.color}`,
          opacity: arcade ? 0.18 : 0.55,
          boxShadow: arcade ? `0 0 16px ${s.color}30` : 'none',
          animation: `bsDrift ${s.dur}s ease-in-out ${s.delay}s infinite`,
        };
        // CSS custom property the bsDrift keyframe reads (not in the CSSProperties type)
        (style as Record<string, string>)['--r'] = `${s.r}deg`;
        return <div key={i} style={style} />;
      })}
    </div>
  );
}
