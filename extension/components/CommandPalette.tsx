/**
 * CommandPalette.tsx — ⌘K / Ctrl+K global search.
 *
 * Searches everything already in memory — courses, assignments, announcements —
 * and navigates on select. No fetching; purely an index over scraped data.
 * Keyboard: ↑/↓ move, Enter opens, Esc closes. Focus stays in the input.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ScrapedCourse } from '../lib/schemas';
import type { Announcement } from '../lib/fetch-announcements';
import type { Page } from './ExtRouter';
import { scorePercent } from '../lib/grade-utils';
import { T, inkOnAccent } from '../lib/theme';

interface Hit {
  group: 'Courses' | 'Assignments' | 'Announcements';
  title: string;
  meta: string;
  right?: string;
  go: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  courses: ScrapedCourse[];
  announcements: Announcement[];
  onNavigate: (p: Page, courseName?: string) => void;
}

const GROUP_CAP = 6;

export function CommandPalette({ open, onClose, courses, announcements, onNavigate }: Props) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      // focus after the overlay paints
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out: Hit[] = [];

    let n = 0;
    for (const c of courses) {
      if (n >= GROUP_CAP) break;
      if (c.name.toLowerCase().includes(needle) || (c.teacher ?? '').toLowerCase().includes(needle)) {
        out.push({
          group: 'Courses', title: c.name, meta: c.teacher || 'Course',
          right: c.grade || undefined,
          go: () => onNavigate('grades', c.name),
        });
        n++;
      }
    }

    n = 0;
    for (const c of courses) {
      for (const cat of c.categories) {
        for (const a of cat.assignments) {
          if (n >= GROUP_CAP) break;
          if (a.name.toLowerCase().includes(needle)) {
            const pct = scorePercent(a.score, a.maxGrade);
            out.push({
              group: 'Assignments', title: a.name,
              meta: `${c.name} · ${cat.name}${a.dueDate ? ` · due ${a.dueDate}` : ''}`,
              right: a.exception === 'Missing' ? 'Missing' : pct !== null ? `${pct.toFixed(0)}%` : a.status,
              go: () => onNavigate('grades', c.name),
            });
            n++;
          }
        }
      }
    }

    n = 0;
    for (const a of announcements) {
      if (n >= GROUP_CAP) break;
      const hay = `${a.author} ${a.courseName} ${a.body}`.toLowerCase();
      if (hay.includes(needle)) {
        out.push({
          group: 'Announcements',
          title: a.body.slice(0, 80) || '(no text)',
          meta: `${a.author}${a.courseName ? ` · ${a.courseName}` : ''}${a.timeText ? ` · ${a.timeText}` : ''}`,
          go: () => onNavigate('announcements'),
        });
        n++;
      }
    }
    return out;
  }, [q, courses, announcements, onNavigate]);

  useEffect(() => { setSel(0); }, [q]);

  // keep selection visible
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${sel}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); e.stopPropagation(); hits[sel].go(); onClose(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.stopPropagation(); /* keep page nav out of the input */ }
  }

  let lastGroup: string | null = null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search everything"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483300,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
      }}
    >
      <div style={{
        width: 'min(560px, calc(100% - 48px))',
        background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', maxHeight: '60vh',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: `1px solid ${T.border}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search courses, assignments, announcements…"
            aria-label="Search"
            style={{
              flex: 1, height: 46, background: 'transparent', border: 'none', outline: 'none',
              color: T.text, fontSize: 14, fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: 10, fontWeight: 700, color: T.muted, border: `1px solid ${T.border}`,
            borderRadius: 5, padding: '2px 6px', fontFamily: 'inherit',
          }}>esc</kbd>
        </div>

        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {q.trim() === '' ? (
            <div style={{ padding: '22px 18px', fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
              Type to search everything Better SGY has scraped — course names, every assignment, and recent announcements.
            </div>
          ) : hits.length === 0 ? (
            <div style={{ padding: '22px 18px', fontSize: 12.5, color: T.muted }}>
              No matches for “{q.trim()}”.
            </div>
          ) : (
            hits.map((h, i) => {
              const header = h.group !== lastGroup ? h.group : null;
              lastGroup = h.group;
              const active = i === sel;
              return (
                <React.Fragment key={`${h.group}-${h.title}-${i}`}>
                  {header && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                      color: T.muted, padding: '12px 18px 6px',
                    }}>{header}</div>
                  )}
                  <div
                    data-idx={i}
                    role="button"
                    tabIndex={-1}
                    onMouseEnter={() => setSel(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { h.go(); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
                      cursor: 'pointer',
                      background: active ? T.activeBg : 'transparent',
                      boxShadow: active ? `inset 2px 0 0 ${T.primary}` : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.title}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.meta}
                      </div>
                    </div>
                    {h.right && (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: h.right === 'Missing' ? T.red : T.muted, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {h.right}
                      </span>
                    )}
                    {active && (
                      <span aria-hidden="true" style={{
                        fontSize: 10, fontWeight: 700, color: inkOnAccent(), background: T.primary,
                        borderRadius: 5, padding: '2px 6px', flexShrink: 0,
                      }}>↵</span>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
