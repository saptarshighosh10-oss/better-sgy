/**
 * GpaPlanner.tsx — "what gets me to my target GPA" (Grades sidebar).
 *
 * Inverse of the final-exam calculator: pick a target unweighted GPA and see
 * which single-course letter bumps move you the most. Pure math over scraped
 * data; nothing fetched or stored except the target (localStorage).
 */

import React, { useState } from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import { parseGradeString } from '../lib/grade-utils';
import { T } from '../lib/theme';

const TARGET_KEY = '__bs_gpa_target__';

/** GPA points ladder + the next threshold up for each percent. */
const LADDER: Array<{ min: number; pts: number; label: string }> = [
  { min: 93, pts: 4.0, label: 'A' },
  { min: 90, pts: 3.7, label: 'A−' },
  { min: 87, pts: 3.3, label: 'B+' },
  { min: 83, pts: 3.0, label: 'B' },
  { min: 80, pts: 2.7, label: 'B−' },
  { min: 77, pts: 2.3, label: 'C+' },
  { min: 73, pts: 2.0, label: 'C' },
  { min: 70, pts: 1.7, label: 'C−' },
  { min: 60, pts: 1.0, label: 'D' },
  { min: 0, pts: 0.0, label: 'F' },
];

function pointsFor(pct: number): number {
  return LADDER.find((l) => pct >= l.min)?.pts ?? 0;
}

/** The next rung above this percent, or null if already at the top. */
function nextRung(pct: number): { min: number; pts: number; label: string } | null {
  const idx = LADDER.findIndex((l) => pct >= l.min);
  return idx > 0 ? LADDER[idx - 1] : null;
}

export function GpaPlanner({ courses }: { courses: ScrapedCourse[] }) {
  const [target, setTarget] = useState<string>(() => {
    try { return localStorage.getItem(TARGET_KEY) ?? '4.00'; } catch { return '4.00'; }
  });
  const [open, setOpen] = useState(false);

  const graded = courses
    .map((c) => ({ name: c.name, pct: parseGradeString(c.grade).percent }))
    .filter((c): c is { name: string; pct: number } => c.pct !== null);

  if (graded.length === 0) return null;

  const current = graded.reduce((s, c) => s + pointsFor(c.pct), 0) / graded.length;
  const t = Number(target);
  const validTarget = Number.isFinite(t) && t > 0 && t <= 4.0;

  // For each course: GPA if just that course climbs to its next letter rung.
  const bumps = graded
    .map((c) => {
      const rung = nextRung(c.pct);
      if (!rung) return null;
      const newGpa = (graded.reduce((s, x) => s + (x.name === c.name ? rung.pts : pointsFor(x.pct)), 0)) / graded.length;
      return { name: c.name, needPct: rung.min, label: rung.label, gain: newGpa - current, newGpa, away: rung.min - c.pct };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null && b.gain > 0.0001)
    .sort((a, b) => (a.away / Math.max(0.0001, a.gain)) - (b.away / Math.max(0.0001, b.gain)))
    .slice(0, 3);

  const maxPossible = 4.0; // every course at A
  const reached = validTarget && current >= t - 1e-9;
  const reachable = validTarget && t <= maxPossible;

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="bs-focusable"
        style={{
          all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', width: '100%', padding: '11px 14px', boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted }}>
          GPA Planner
        </span>
        <span aria-hidden="true" style={{ color: T.muted, fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }}>▼</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, fontWeight: 600, color: T.muted }}>
              Target (unweighted)
              <input
                type="number" min={0} max={4} step={0.1} value={target}
                onChange={(e) => { setTarget(e.target.value); try { localStorage.setItem(TARGET_KEY, e.target.value); } catch { /* blocked */ } }}
                onKeyDown={(e) => e.stopPropagation()}
                className="bs-focusable"
                style={{
                  width: 64, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
                  color: T.text, fontSize: 13, fontWeight: 600, padding: '5px 8px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </label>
            <div style={{ paddingBottom: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{current.toFixed(2)}</div>
              <div style={{ fontSize: 9.5, color: T.muted, marginTop: 3 }}>current</div>
            </div>
          </div>

          <div aria-live="polite" style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 10, color: reached ? T.green : reachable ? T.muted : T.amber, fontWeight: 600 }}>
            {!validTarget ? 'Enter a target between 0 and 4.'
              : reached ? `You're at ${current.toFixed(2)} — target met. Hold the line.`
              : !reachable ? 'Above a 4.0 unweighted — not reachable this semester.'
              : `Need +${(t - current).toFixed(2)}. Best single-course moves:`}
          </div>

          {validTarget && !reached && reachable && bumps.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bumps.map((b) => (
                <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                  <span style={{ flex: 1, minWidth: 0, color: T.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.name}
                  </span>
                  <span style={{ color: T.muted, flexShrink: 0 }}>→ {b.label} ({b.needPct}%)</span>
                  <span style={{ color: T.green, fontWeight: 800, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    +{b.gain.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
