import React from 'react';
import { T } from '../lib/theme';

interface Tri {
  size: number;
  top: number;       // vertical position (% of viewport)
  alpha: string;     // 2-digit hex alpha → semi-transparent fill
  dir: 'fwd' | 'bwd';
  dur: number;       // seconds (slow)
  delay: number;     // NEGATIVE → starts mid-cycle so motion is already underway
  r0: number;        // rotation at entry
  r1: number;        // rotation at exit (slow spin across the drift)
  clip: string;      // sharp triangle via clip-path
  color: string;
}

// A spread of sharp triangle shapes (point up / down / left / right / corners).
const CLIPS = {
  up: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  down: 'polygon(0% 0%, 100% 0%, 50% 100%)',
  right: 'polygon(0% 0%, 100% 50%, 0% 100%)',
  left: 'polygon(100% 0%, 0% 50%, 100% 100%)',
  cornerBR: 'polygon(100% 0%, 100% 100%, 0% 100%)',
  cornerBL: 'polygon(0% 0%, 0% 100%, 100% 100%)',
};

/**
 * Minimal animated game background: sharp clip-path triangles drifting across the
 * viewport with depth/parallax + a very slow spin. Forward triangles scale up and
 * drift left→right (come closer); backward ones scale down and drift right→left
 * (recede). NEGATIVE animation-delays mean the scene is already mid-motion when the
 * page opens (no "starting from a corner"), and each loops seamlessly off-screen.
 * Fixed + pointer-events-none + low z-index so it never blocks the game.
 */
export function GameBackground() {
  const tris: Tri[] = [
    { size: 240, top: -8, alpha: '1e', dir: 'fwd', dur: 42, delay: -12, r0: 0,   r1: 34,  clip: CLIPS.up,      color: T.primary },
    { size: 150, top: 22, alpha: '17', dir: 'bwd', dur: 54, delay: -30, r0: 10,  r1: -28, clip: CLIPS.right,   color: T.primary },
    { size: 320, top: 46, alpha: '0f', dir: 'fwd', dur: 64, delay: -22, r0: -8,  r1: 22,  clip: CLIPS.cornerBR,color: T.primary },
    { size: 110, top: 10, alpha: '2a', dir: 'fwd', dur: 34, delay: -5,  r0: 18,  r1: 52,  clip: CLIPS.up,      color: T.green },
    { size: 200, top: 62, alpha: '13', dir: 'bwd', dur: 50, delay: -40, r0: -14, r1: -46, clip: CLIPS.down,    color: T.amber },
    { size: 140, top: 36, alpha: '1d', dir: 'bwd', dur: 58, delay: -18, r0: 6,   r1: -30, clip: CLIPS.up,      color: T.primary },
    { size: 180, top: 80, alpha: '14', dir: 'fwd', dur: 46, delay: -35, r0: -20, r1: 14,  clip: CLIPS.left,    color: T.primary },
    { size: 90,  top: 52, alpha: '24', dir: 'fwd', dur: 30, delay: -9,  r0: 30,  r1: 64,  clip: CLIPS.up,      color: T.red },
    { size: 270, top: 16, alpha: '11', dir: 'bwd', dur: 60, delay: -48, r0: 4,   r1: -26, clip: CLIPS.cornerBL,color: T.primary },
    { size: 120, top: 70, alpha: '1f', dir: 'fwd', dur: 38, delay: -26, r0: -6,  r1: 28,  clip: CLIPS.right,   color: T.primary },
    { size: 160, top: 90, alpha: '16', dir: 'bwd', dur: 48, delay: -14, r0: 16,  r1: -18, clip: CLIPS.down,    color: T.green },
  ];

  return (
    <div className="bs-game-bg" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {tris.map((t, i) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          top: `${t.top}%`,
          left: 0,
          width: t.size,
          height: t.size,
          background: `${t.color}${t.alpha}`,
          clipPath: t.clip,
          animation: `bsTri${t.dir === 'fwd' ? 'Fwd' : 'Bwd'} ${t.dur}s ease-in-out ${t.delay}s infinite`,
          willChange: 'transform, opacity',
        };
        (style as Record<string, string>)['--r0'] = `${t.r0}deg`;
        (style as Record<string, string>)['--r1'] = `${t.r1}deg`;
        return <div key={i} style={style} />;
      })}
    </div>
  );
}
