/**
 * GradeChanges.tsx — "what changed since you last looked" feed (Overview).
 *
 * Renders the change events recorded at scrape time (lib/grade-changes).
 * Events newer than the last-seen timestamp get an accent edge tick; opening
 * the Overview marks everything seen after a beat.
 */

import React, { useEffect, useState } from 'react';
import { loadChanges, getLastSeen, markChangesSeen, type ChangeEvent } from '../lib/grade-changes';
import { T } from '../lib/theme';

function ago(ts: number): string {
  const d = Date.now() - ts;
  if (d < 3_600_000) return `${Math.max(1, Math.floor(d / 60_000))}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

export function GradeChanges() {
  const [events, setEvents] = useState<ChangeEvent[] | null>(null);
  const [lastSeen] = useState<number>(() => getLastSeen());

  useEffect(() => {
    let alive = true;
    loadChanges().then((ev) => { if (alive) setEvents(ev.slice(0, 6)); });
    // Viewing the overview counts as "seen" — but give the user a beat to notice.
    const id = setTimeout(() => markChangesSeen(), 4000);
    return () => { alive = false; clearTimeout(id); };
  }, []);

  if (!events || events.length === 0) return null;

  return (
    <section
      aria-label="Recent grade changes"
      style={{
        background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12,
        overflow: 'hidden', marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>What changed</span>
        <span style={{ fontSize: 11.5, color: T.muted }}>since recent scrapes</span>
      </div>
      {events.map((e, i) => {
        const isNew = e.ts > lastSeen;
        let main: React.ReactNode;
        let badge: React.ReactNode = null;

        if (e.kind === 'grade') {
          const up = e.delta >= 0;
          main = <span style={{ fontWeight: 600 }}>{e.course}</span>;
          badge = (
            <span style={{
              fontSize: 11.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: up ? T.green : T.red, whiteSpace: 'nowrap',
            }}>
              {e.oldPct?.toFixed(1) ?? '—'}% → {e.newPct?.toFixed(1) ?? '—'}%
            </span>
          );
        } else if (e.kind === 'graded') {
          main = (
            <span>
              <span style={{ fontWeight: 600 }}>{e.name}</span>
              <span style={{ color: T.muted }}> graded · {e.course}</span>
            </span>
          );
          if (e.pct !== null && e.pct !== undefined) {
            badge = <span style={{ fontSize: 11.5, fontWeight: 800, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{e.pct.toFixed(0)}%</span>;
          }
        } else {
          // new-assignment
          main = (
            <span>
              <span style={{ fontWeight: 600 }}>{e.name}</span>
              <span style={{ color: T.muted }}> · {e.course}</span>
            </span>
          );
          badge = (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
              color: T.primary, background: `${T.primary}21`, border: `1px solid ${T.primary}4d`,
              borderRadius: 999, padding: '2px 7px',
            }}>New</span>
          );
        }
        return (
          <div key={`${e.ts}-${i}`} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
            borderBottom: i < events.length - 1 ? `1px solid ${T.rowBorder}` : 'none',
            boxShadow: isNew ? `inset 3px 0 0 ${T.primary}` : 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {main}
            </div>
            {badge}
            <span style={{ fontSize: 11, color: T.muted, flexShrink: 0, width: 52, textAlign: 'right' }}>{ago(e.ts)}</span>
          </div>
        );
      })}
    </section>
  );
}
