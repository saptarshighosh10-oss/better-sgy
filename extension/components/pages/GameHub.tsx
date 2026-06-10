import React, { useState, useEffect } from 'react';
import type { ScrapedCourse } from '../../lib/schemas';
import { T, inkOnAccent } from '../../lib/theme';
import { GamePage } from './GamePage';
import { CavemanGame } from './CavemanGame';
import { NeonProtocol } from './NeonProtocol';

interface Props {
  grades: { courses: ScrapedCourse[] };
}

interface GameDef {
  key: string;
  name: string;
  tag: string;
  desc: string;
  icon: string;
}

const GAMES: GameDef[] = [
  { key: 'neon', name: 'Neon Protocol', tag: 'FPS', desc: 'Holographic arena survival', icon: '🔫' },
  { key: 'caveman', name: 'Caveman Canyon Run', tag: '3D Runner', desc: 'Endless prehistoric dodger', icon: '🏃' },
  { key: 'breakout', name: 'Grade Breaker', tag: 'Arcade', desc: 'Brick-breaking chaos', icon: '🧱' },
];

const FAV_KEY = '__bs_fav_games__';
function loadFavs(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]') as string[]); } catch { return new Set(); }
}
function saveFavs(s: Set<string>) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...s])); } catch { /* blocked */ }
}

const RETRO = "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export function GameHub({ grades }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [favs, setFavs] = useState<Set<string>>(() => loadFavs());
  const [savedFlash, setSavedFlash] = useState(false);

  const toggleFav = (key: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      saveFavs(next);
      return next;
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const [fullscreen, setFullscreen] = useState(false);

  // Tell the router a game is actively being played so it stops stealing the arrow
  // keys for page-nav (the games use arrows). On the SELECT GAME menu, arrows navigate.
  useEffect(() => {
    (window as { __bsGameActive?: boolean }).__bsGameActive = selected !== null;
    if (!selected) setFullscreen(false); // leaving a game drops out of fullscreen
    return () => { (window as { __bsGameActive?: boolean }).__bsGameActive = false; };
  }, [selected]);

  const isFav = selected ? favs.has(selected) : false;

  // ── Whatever shows inside the CRT ────────────────────────────────
  const screenContent = selected ? (
    <>
      {selected === 'caveman' ? <CavemanGame /> : selected === 'neon' ? <NeonProtocol /> : <GamePage grades={grades} />}
      {/* Scanlines + vignette for CRT flavor */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40,
        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 3px)',
        boxShadow: 'inset 0 0 90px rgba(0,0,0,0.55)',
        mixBlendMode: 'multiply',
      }} />
      {/* In-screen toolbar: exit + save */}
      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 7, zIndex: 60 }}>
        <button type="button" onClick={() => setSelected(null)} className="bs-focusable bs-lift"
          style={pillBtn(false)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          Exit
        </button>
        <button type="button" onClick={() => toggleFav(selected)} className="bs-focusable bs-lift"
          title={isFav ? 'Remove from saved' : 'Save to your games'} style={pillBtn(isFav)}>
          {isFav ? '★' : '☆'} {savedFlash ? 'Saved!' : isFav ? 'Saved' : 'Save'}
        </button>
        <button type="button" onClick={() => setFullscreen((f) => !f)} className="bs-focusable bs-lift"
          title={fullscreen ? 'Back to the cabinet' : 'Zoom into fullscreen'} style={pillBtn(false)}>
          {fullscreen ? (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 9 4 4m0 0v4m0-4h4M15 9l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m6-4 5 5m0 0v-4m0 4h-4" /></svg> Windowed</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" /></svg> Fullscreen</>
          )}
        </button>
      </div>
    </>
  ) : (
    // Retro "SELECT GAME" menu rendered inside the CRT
    <div style={{ position: 'absolute', inset: 0, background: '#04060a', overflowY: 'auto', padding: '22px 22px 26px', fontFamily: RETRO }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ color: T.primary, fontSize: 20, fontWeight: 800, letterSpacing: '4px', textShadow: `0 0 14px ${T.primary}` }}>SELECT GAME</div>
        <div style={{ color: '#6b7280', fontSize: 10, letterSpacing: '2px', marginTop: 4 }}>★ FREE PLAY ★</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460, margin: '0 auto' }}>
        {[...GAMES].sort((a, b) => Number(favs.has(b.key)) - Number(favs.has(a.key))).map((g, i) => {
          const fav = favs.has(g.key);
          return (
            <button key={g.key} type="button" onClick={() => setSelected(g.key)} className="bs-focusable bs-game-row"
              style={{
                all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 8, boxSizing: 'border-box',
                border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)',
                animationDelay: `${i * 60}ms`,
              }}>
              <span style={{ fontSize: 30, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>{g.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', color: '#f8fafc', fontSize: 14, fontWeight: 700, letterSpacing: '1px' }}>{g.name.toUpperCase()}</span>
                <span style={{ display: 'block', color: '#7c8597', fontSize: 10, letterSpacing: '1px', marginTop: 3 }}>{g.tag.toUpperCase()} · {g.desc.toUpperCase()}</span>
              </span>
              {fav && <span style={{ color: '#fbbf24', fontSize: 16 }}>★</span>}
              <span style={{ color: T.primary, fontSize: 16, fontWeight: 800 }}>▶</span>
            </button>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', color: T.primary, fontSize: 11, letterSpacing: '3px', marginTop: 20, opacity: 0.9 }} className="bs-blink">
        PRESS ▶ TO PLAY
      </div>
    </div>
  );

  // ── The cabinet ─────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: T.bg, paddingLeft: 14, display: 'flex', justifyContent: 'center' }}>
      <style>{`
        .bs-blink { animation: bsBlink 1.1s steps(1) infinite; }
        @keyframes bsBlink { 50% { opacity: 0.15; } }
        .bs-game-row:hover { background: ${T.primary}22 !important; border-color: ${T.primary}88 !important; transform: translateX(3px); transition: transform .12s; }
        @keyframes bsArcFloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-22px) rotate(6deg); } }
        .bs-arc-gutter { display: block; }
        @media (max-width: 960px) { .bs-arc-gutter { display: none; } }
        @keyframes bsScreenZoom { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <ArcadeSideArt side="left" />
      <ArcadeSideArt side="right" />

      <div style={{ width: 'min(580px, 100%)', padding: '12px 18px 24px', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
        {/* Cabinet shell */}
        <div style={{
          background: 'linear-gradient(180deg, #1c1c22, #0e0e12)',
          border: `2px solid ${T.primary}`,
          borderRadius: '26px 26px 16px 16px',
          padding: 12,
          boxShadow: `0 26px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.6), 0 0 50px ${T.primary}22`,
        }}>
          {/* Marquee */}
          <div style={{
            borderRadius: 14, padding: '9px 16px', marginBottom: 10, textAlign: 'center', position: 'relative', overflow: 'hidden',
            background: `linear-gradient(180deg, ${T.primary}, ${T.primary}aa)`,
            boxShadow: `0 0 24px ${T.primary}66, inset 0 -3px 8px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.25)`,
          }}>
            <div style={{ fontFamily: RETRO, fontSize: 22, fontWeight: 800, letterSpacing: '6px', color: inkOnAccent(), textShadow: '0 2px 0 rgba(0,0,0,0.25)' }}>
              ARCADE
            </div>
            <div style={{ fontFamily: RETRO, fontSize: 9, letterSpacing: '3px', color: inkOnAccent(), opacity: 0.7, marginTop: 2 }}>
              BETTER SGY
            </div>
            {/* marquee bulbs */}
            <div style={{ position: 'absolute', top: 6, left: 10, right: 10, display: 'flex', justifyContent: 'space-between' }} aria-hidden="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: inkOnAccent(), opacity: 0.5 }} />
              ))}
            </div>
          </div>

          {/* Screen bezel */}
          <div style={{ background: '#000', borderRadius: 16, padding: 12, boxShadow: 'inset 0 0 0 2px #2a2a2a, inset 0 6px 20px rgba(0,0,0,0.8)' }}>
            <div style={fullscreen ? {
              position: 'fixed', inset: 0, zIndex: 2147483000, borderRadius: 0, overflow: 'hidden',
              background: '#04060a', transformOrigin: 'center center',
              animation: 'bsScreenZoom 0.42s cubic-bezier(0.16, 1, 0.3, 1)',
            } : {
              position: 'relative', width: '100%', height: 408, borderRadius: 10, overflow: 'hidden',
              background: '#04060a', boxShadow: `0 0 30px ${T.primary}22, inset 0 0 0 1px rgba(255,255,255,0.05)`,
            }}>
              {screenContent}
            </div>
          </div>

          {/* Control deck */}
          <div style={{
            marginTop: 12, borderRadius: 12, padding: '14px 22px',
            background: `linear-gradient(180deg, ${T.primary}26, #141418)`,
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Joystick */}
            <div aria-hidden="true" style={{ position: 'relative', width: 46, height: 46 }}>
              <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 40, height: 18, borderRadius: '50%', background: '#0a0a0a', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.08)' }} />
              <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 7, height: 26, borderRadius: 4, background: '#2b2b2b' }} />
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 18, height: 18, borderRadius: '50%', background: T.red || '#ef4444', boxShadow: 'inset -2px -3px 4px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)' }} />
            </div>
            <div style={{ fontFamily: RETRO, fontSize: 9, letterSpacing: '2px', color: '#6b7280' }}>
              {selected ? 'PLAYING — EXIT TO SWITCH' : 'INSERT COIN · PICK A GAME'}
            </div>
            {/* Buttons */}
            <div aria-hidden="true" style={{ display: 'flex', gap: 8 }}>
              {[T.primary, '#fbbf24', T.red || '#ef4444'].map((c, i) => (
                <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: c, boxShadow: 'inset -2px -3px 4px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          </div>

          {/* ===== Tall cabinet pedestal — the long rectangular base, faux-3D ===== */}
          <div style={{ marginTop: 12, position: 'relative', perspective: '900px' }}>
            {/* Top depth ledge — tilted back so the cabinet top "recedes" (3D hint) */}
            <div aria-hidden="true" style={{
              height: 18, margin: '0 8px -6px', borderRadius: '12px 12px 0 0',
              background: `linear-gradient(180deg, ${T.primary}66, #15151b)`,
              boxShadow: `inset 0 2px 0 ${T.primary}99, 0 -3px 12px ${T.primary}40`,
              transform: 'rotateX(36deg)', transformOrigin: 'bottom',
            }} />

            {/* Front face of the pedestal */}
            <div style={{
              position: 'relative', overflow: 'hidden', minHeight: 222,
              borderRadius: '6px 6px 4px 4px', padding: '16px 28px 18px',
              background: 'linear-gradient(180deg, #1b1b22 0%, #111116 52%, #0b0b0e 100%)',
              borderLeft: `3px solid ${T.primary}`, borderRight: `3px solid ${T.primary}`,
              boxShadow: `inset 0 10px 26px rgba(0,0,0,0.65), inset 0 -8px 20px rgba(0,0,0,0.5), 0 34px 60px rgba(0,0,0,0.55), 0 0 42px ${T.primary}1f`,
            }}>
              {/* cylindrical edge shading → rounded 3D front */}
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 16%, transparent 84%, rgba(0,0,0,0.5) 100%)' }} />
              {/* glowing accent side-art stripes */}
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 9, background: `linear-gradient(180deg, ${T.primary}, ${T.primary}22)`, boxShadow: `0 0 18px ${T.primary}` }} />
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 9, background: `linear-gradient(180deg, ${T.primary}, ${T.primary}22)`, boxShadow: `0 0 18px ${T.primary}` }} />

              {/* speakers + coin door */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
                <SpeakerGrille />
                <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                  <div style={{
                    width: 104, margin: '0 auto', borderRadius: 8, padding: '10px 8px 8px',
                    background: 'linear-gradient(180deg, #26262c, #141417)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: 'inset 0 3px 7px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ width: 36, height: 8, margin: '0 auto 7px', borderRadius: 3, background: '#000', boxShadow: `0 0 9px ${T.primary}88, inset 0 1px 2px rgba(0,0,0,0.9)`, border: `1px solid ${T.primary}66` }} />
                    <div style={{ fontFamily: RETRO, fontSize: 8, letterSpacing: '1.5px', color: T.primary, textShadow: `0 0 8px ${T.primary}` }}>INSERT COIN</div>
                    <div style={{ fontFamily: RETRO, fontSize: 7, letterSpacing: '1px', color: '#6b7280', marginTop: 3 }}>FREE PLAY</div>
                  </div>
                </div>
                <SpeakerGrille />
              </div>

              {/* center accent emblem / decal */}
              <div style={{ position: 'relative', textAlign: 'center', marginTop: 24 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  padding: '12px 26px', borderRadius: 12,
                  border: `2px solid ${T.primary}`, background: `${T.primary}14`,
                  boxShadow: `0 0 22px ${T.primary}44, inset 0 0 18px ${T.primary}18`,
                }}>
                  <span style={{ fontFamily: RETRO, fontSize: 26, fontWeight: 800, letterSpacing: '6px', color: T.primary, textShadow: `0 0 16px ${T.primary}` }}>BS</span>
                  <span style={{ width: 1, height: 26, background: `${T.primary}66` }} />
                  <span style={{ fontFamily: RETRO, fontSize: 10, letterSpacing: '3px', color: '#9aa3b2', textAlign: 'left', lineHeight: 1.5 }}>BETTER<br />SGY</span>
                </div>
              </div>

              {/* ventilation slits */}
              <div aria-hidden="true" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', marginTop: 20 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: `${50 - i * 8}%`, height: 4, borderRadius: 3, background: 'rgba(0,0,0,0.6)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            </div>

            {/* kick panel + feet */}
            <div style={{
              position: 'relative', borderRadius: '0 0 14px 14px', padding: '12px 24px 14px', textAlign: 'center',
              background: 'linear-gradient(180deg, #0a0a0d, #050507)',
              borderLeft: `3px solid ${T.primary}`, borderRight: `3px solid ${T.primary}`,
            }}>
              <div style={{ fontFamily: RETRO, fontSize: 9, letterSpacing: '4px', color: '#4b5563' }}>© BETTER SGY ARCADE</div>
              <div aria-hidden="true" style={{ position: 'absolute', bottom: -5, left: '12%', width: 36, height: 8, borderRadius: '0 0 4px 4px', background: '#000', boxShadow: '0 4px 8px rgba(0,0,0,0.6)' }} />
              <div aria-hidden="true" style={{ position: 'absolute', bottom: -5, right: '12%', width: 36, height: 8, borderRadius: '0 0 4px 4px', background: '#000', boxShadow: '0 4px 8px rgba(0,0,0,0.6)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Floating arcade glyphs that fill the empty gutters beside the cabinet. */
function ArcadeSideArt({ side }: { side: 'left' | 'right' }) {
  const glyphs = side === 'left'
    ? [
        { c: '▲', t: '11%', s: 30, col: T.primary }, { c: '●', t: '29%', s: 22, col: T.amber },
        { c: '★', t: '48%', s: 26, col: T.green }, { c: '◆', t: '67%', s: 20, col: T.red },
        { c: '1UP', t: '85%', s: 13, col: T.primary },
      ]
    : [
        { c: '★', t: '15%', s: 26, col: T.primary }, { c: '◆', t: '33%', s: 22, col: T.green },
        { c: '▲', t: '54%', s: 30, col: T.amber }, { c: '●', t: '73%', s: 24, col: T.red },
        { c: 'HI', t: '89%', s: 13, col: T.primary },
      ];
  const edge = side === 'left' ? { left: 0 } : { right: 0 };
  return (
    <div className="bs-arc-gutter" aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, ...edge, width: 140, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {/* soft accent glow in the gutter */}
      <div style={{ position: 'absolute', top: '34%', ...(side === 'left' ? { left: '-40%' } : { right: '-40%' }), width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${T.primary}22, transparent 70%)`, filter: 'blur(24px)' }} />
      {glyphs.map((g, i) => {
        const inset = 16 + (i % 2) * 30;
        return (
          <span key={i} style={{
            position: 'absolute', top: g.t, ...(side === 'left' ? { left: inset } : { right: inset }),
            fontFamily: RETRO, fontWeight: 800, fontSize: g.s, color: g.col, opacity: 0.22,
            textShadow: `0 0 14px ${g.col}`, animation: `bsArcFloat ${6 + i}s ease-in-out ${i * 0.45}s infinite`,
          }}>{g.c}</span>
        );
      })}
    </div>
  );
}

/** Retro dot-matrix speaker grille for the cabinet's lower body. */
function SpeakerGrille() {
  return (
    <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 6px)', gap: 5, opacity: 0.8 }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#000', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.04)' }} />
      ))}
    </div>
  );
}

function pillBtn(active: boolean): React.CSSProperties {
  return {
    all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
    background: active ? T.primary : 'rgba(15,15,18,0.8)', color: active ? inkOnAccent() : '#fff',
    border: `1px solid ${active ? T.primary : 'rgba(255,255,255,0.18)'}`,
    borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700,
    boxShadow: '0 6px 18px rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
  };
}
