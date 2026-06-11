/**
 * PersonalTasks.tsx — a tiny personal checklist (Overview).
 *
 * For breaking school work into your own steps ("outline essay", "make quiz
 * notecard"). Local only (localStorage), capped, no sync, no network.
 */

import React, { useState } from 'react';
import { T, inkOnAccent } from '../lib/theme';

const KEY = '__bs_personal_tasks__';
const CAP = 30;

interface Task {
  id: string;
  text: string;
  done: boolean;
  ts: number;
}

function load(): Task[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Task[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persist(tasks: Task[]) {
  try { localStorage.setItem(KEY, JSON.stringify(tasks.slice(-CAP))); } catch { /* blocked */ }
}

export function PersonalTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => load());
  const [draft, setDraft] = useState('');

  function update(next: Task[]) {
    setTasks(next);
    persist(next);
  }

  function add() {
    const text = draft.trim();
    if (!text) return;
    update([...tasks, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, done: false, ts: Date.now() }]);
    setDraft('');
  }

  const openCount = tasks.filter((t) => !t.done).length;

  return (
    <section
      aria-label="My tasks"
      style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted }}>
          My tasks
        </span>
        {tasks.length > 0 && (
          <span style={{ fontSize: 11, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
            {openCount === 0 ? 'all done ✓' : `${openCount} open`}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); e.stopPropagation(); }}
          placeholder="Add a step… e.g. outline essay intro"
          aria-label="New task"
          className="bs-focusable"
          style={{
            flex: 1, minWidth: 0, background: T.bg, border: `1px solid ${T.border}`,
            borderRadius: 8, color: T.text, fontSize: 12.5, padding: '8px 10px',
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={add}
          aria-label="Add task"
          className="bs-focusable"
          style={{
            all: 'unset', cursor: 'pointer', background: T.primary, color: inkOnAccent(),
            fontSize: 16, fontWeight: 700, borderRadius: 8, width: 34, textAlign: 'center',
            lineHeight: '34px', flexShrink: 0,
          }}
        >＋</button>
      </div>

      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 180, overflowY: 'auto' }}>
          {[...tasks].sort((a, b) => Number(a.done) - Number(b.done) || b.ts - a.ts).map((t) => (
            <div key={t.id} className="bs-reveal-parent" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 2px',
              borderBottom: `1px solid ${T.rowBorder}`,
            }}>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => update(tasks.map((x) => x.id === t.id ? { ...x, done: !x.done } : x))}
                aria-label={`${t.done ? 'Reopen' : 'Complete'}: ${t.text}`}
                className="bs-focusable"
                style={{ accentColor: T.primary, width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{
                flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4,
                color: t.done ? T.muted : T.text,
                textDecoration: t.done ? 'line-through' : 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{t.text}</span>
              <button
                type="button"
                onClick={() => update(tasks.filter((x) => x.id !== t.id))}
                aria-label={`Delete: ${t.text}`}
                className="bs-focusable bs-reveal"
                style={{ all: 'unset', cursor: 'pointer', color: T.muted, fontSize: 13, padding: '0 4px', flexShrink: 0 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
