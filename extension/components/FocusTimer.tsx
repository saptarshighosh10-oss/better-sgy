/**
 * FocusTimer.tsx — a small Pomodoro-style study timer (Overview).
 *
 * 25-minute focus / 5-minute break. Fully local: state survives reloads via
 * localStorage (end-timestamp based, so it stays accurate without a running
 * page). No notifications permission — completion is shown in-UI only.
 */

import React, { useEffect, useState } from 'react';
import { T, inkOnAccent } from '../lib/theme';

const KEY = '__bs_focus_timer__';
const FOCUS_MIN = 25;
const BREAK_MIN = 5;

interface TimerState {
  mode: 'focus' | 'break';
  endsAt: number | null;   // epoch ms while running, null when idle/paused
  remaining: number;       // seconds remaining when paused/idle
  sessions: number;        // completed focus sessions today
  day: string;             // YYYY-MM-DD the sessions count belongs to
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function load(): TimerState {
  const fresh: TimerState = { mode: 'focus', endsAt: null, remaining: FOCUS_MIN * 60, sessions: 0, day: today() };
  if (typeof localStorage === 'undefined') return fresh;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const s = JSON.parse(raw) as TimerState;
    if (s.day !== today()) { s.sessions = 0; s.day = today(); }
    return { ...fresh, ...s };
  } catch {
    return fresh;
  }
}

function save(s: TimerState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* blocked */ }
}

export function FocusTimer() {
  const [state, setState] = useState<TimerState>(() => load());
  const [, tick] = useState(0);

  // 1Hz tick while running (cheap; cleared when idle)
  useEffect(() => {
    if (state.endsAt === null) return;
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state.endsAt]);

  const secsLeft = state.endsAt !== null
    ? Math.max(0, Math.round((state.endsAt - Date.now()) / 1000))
    : state.remaining;

  // Phase complete → flip mode, count the session, stop.
  useEffect(() => {
    if (state.endsAt !== null && secsLeft === 0) {
      const next: TimerState = state.mode === 'focus'
        ? { ...state, mode: 'break', endsAt: null, remaining: BREAK_MIN * 60, sessions: state.sessions + 1, day: today() }
        : { ...state, mode: 'focus', endsAt: null, remaining: FOCUS_MIN * 60 };
      setState(next); save(next);
    }
  }, [secsLeft, state]);

  const running = state.endsAt !== null;
  const mm = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const ss = String(secsLeft % 60).padStart(2, '0');
  const total = (state.mode === 'focus' ? FOCUS_MIN : BREAK_MIN) * 60;
  const frac = total > 0 ? 1 - secsLeft / total : 0;

  function startPause() {
    const next: TimerState = running
      ? { ...state, endsAt: null, remaining: secsLeft }
      : { ...state, endsAt: Date.now() + secsLeft * 1000 };
    setState(next); save(next);
  }

  function reset() {
    const next: TimerState = { ...state, endsAt: null, remaining: (state.mode === 'focus' ? FOCUS_MIN : BREAK_MIN) * 60 };
    setState(next); save(next);
  }

  const btn: React.CSSProperties = {
    all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, borderRadius: 8,
    padding: '6px 13px', boxSizing: 'border-box',
  };

  return (
    <section
      aria-label="Focus timer"
      style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted }}>
          {state.mode === 'focus' ? 'Focus timer' : 'Break'}
          {state.sessions > 0 && <span style={{ marginLeft: 8, color: T.primary }}>{state.sessions}× today</span>}
        </div>
        <div
          role="timer"
          aria-live={running ? 'off' : 'polite'}
          style={{ fontSize: 30, fontWeight: 800, color: T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 4 }}
        >
          {mm}:{ss}
        </div>
        {/* progress meter */}
        <div aria-hidden="true" style={{ height: 6, borderRadius: 999, background: T.faint, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', width: `${Math.round(frac * 100)}%`, background: T.primary, borderRadius: 999, transition: 'width 1s linear' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <button type="button" className="bs-focusable" onClick={startPause}
          style={{ ...btn, background: T.primary, color: inkOnAccent(), textAlign: 'center' }}>
          {running ? 'Pause' : secsLeft === total ? 'Start' : 'Resume'}
        </button>
        <button type="button" className="bs-focusable" onClick={reset}
          style={{ ...btn, border: `1px solid ${T.border}`, color: T.muted, textAlign: 'center' }}>
          Reset
        </button>
      </div>
    </section>
  );
}
