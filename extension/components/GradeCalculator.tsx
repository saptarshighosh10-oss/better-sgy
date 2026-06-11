/**
 * GradeCalculator.tsx — "what do I need on the final?"
 *
 * Pure client-side math on the course's current overall percent:
 *   required = (target − current × (1 − w)) / w        (w = final weight, 0–1)
 *
 * Needs no category/weight data from Schoology, so it works for any course at
 * any school. The chosen final weight is remembered per course (localStorage).
 */

import React, { useEffect, useState } from 'react';
import { T, inkOnAccent } from '../lib/theme';

const WEIGHT_KEY = '__bs_final_weights__';

function loadWeights(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WEIGHT_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function saveWeight(courseName: string, weight: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    const all = loadWeights();
    all[courseName] = weight;
    localStorage.setItem(WEIGHT_KEY, JSON.stringify(all));
  } catch {
    /* storage blocked */
  }
}

const TARGET_CHIPS: Array<{ label: string; value: number }> = [
  { label: 'A · 93', value: 93 },
  { label: 'A− · 90', value: 90 },
  { label: 'B · 83', value: 83 },
  { label: 'C · 73', value: 73 },
];

interface Props {
  courseName: string;
  /** Current overall percent for the course (null if the grade isn't numeric). */
  currentPercent: number | null;
}

export function GradeCalculator({ courseName, currentPercent }: Props) {
  const [weight, setWeight] = useState<string>(() => loadWeights()[courseName] ?? '20');
  const [target, setTarget] = useState<string>('90');

  // Switching courses loads that course's remembered weight.
  useEffect(() => {
    setWeight(loadWeights()[courseName] ?? '20');
  }, [courseName]);

  const w = Number(weight) / 100;
  const t = Number(target);
  const valid =
    currentPercent !== null &&
    Number.isFinite(w) && w > 0 && w <= 1 &&
    Number.isFinite(t) && t > 0;

  let needed: number | null = null;
  if (valid) needed = (t - currentPercent * (1 - w)) / w;

  let verdict: { text: string; color: string } | null = null;
  if (needed !== null) {
    const rounded = Math.max(0, needed);
    if (needed <= 0) {
      verdict = { text: `You're already there — even a 0% on the final keeps you at ${t}%+.`, color: T.green };
    } else if (needed <= 100) {
      verdict = { text: `You need ${rounded.toFixed(1)}% on the final.`, color: needed > 90 ? T.amber : T.green };
    } else if (needed <= 110) {
      verdict = { text: `You'd need ${rounded.toFixed(1)}% — only possible with extra credit.`, color: T.amber };
    } else {
      verdict = { text: `Not reachable (${rounded.toFixed(1)}% needed) — but a strong final still pulls your grade up.`, color: T.red };
    }
  }

  const inputStyle: React.CSSProperties = {
    width: 64,
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    color: T.text,
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 8px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <section
      aria-label="Final grade calculator"
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        marginTop: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Final Exam Calculator
        </span>
        <span style={{ fontSize: 11, color: T.muted }}>
          Current grade: <strong style={{ color: T.text }}>{currentPercent !== null ? `${currentPercent.toFixed(1)}%` : '—'}</strong>
        </span>
      </div>

      {currentPercent === null ? (
        <div style={{ fontSize: 12, color: T.muted, marginTop: 10, lineHeight: 1.5 }}>
          This course doesn't have a numeric grade yet, so there's nothing to calculate.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, fontWeight: 600, color: T.muted }}>
              Final is worth (%)
              <input
                type="number"
                min={1}
                max={100}
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  saveWeight(courseName, e.target.value);
                }}
                className="bs-focusable"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, fontWeight: 600, color: T.muted }}>
              Target grade (%)
              <input
                type="number"
                min={1}
                max={120}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="bs-focusable"
                style={inputStyle}
              />
            </label>
            <div role="group" aria-label="Quick targets" style={{ display: 'flex', gap: 6, paddingBottom: 1, flexWrap: 'wrap' }}>
              {TARGET_CHIPS.map((chip) => {
                const active = Number(target) === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setTarget(String(chip.value))}
                    aria-pressed={active}
                    className="bs-focusable"
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: '5px 10px',
                      background: active ? T.primary : 'transparent',
                      color: active ? inkOnAccent() : T.muted,
                      border: `1px solid ${active ? T.primary : T.border}`,
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            aria-live="polite"
            style={{
              marginTop: 12,
              fontSize: 13,
              fontWeight: 700,
              color: verdict?.color ?? T.muted,
              lineHeight: 1.5,
            }}
          >
            {valid && verdict ? verdict.text : 'Enter a final weight between 1 and 100.'}
          </div>
        </>
      )}
    </section>
  );
}
