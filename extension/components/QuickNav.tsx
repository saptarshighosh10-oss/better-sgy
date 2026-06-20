import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Page } from './ExtRouter';
import type { ScrapedCourse } from '../lib/schemas';
import { parseGradeString, gradeColor } from '../lib/grade-utils';
import { courseColor } from '../lib/course-colors';
import { loadStarredFolders, type StarredFolder } from '../lib/starred-folders';
import { T, inkOnAccent, uiFontStack } from '../lib/theme';

/**
 * Subsequence fuzzy match: every char of `q` must appear in order in `text`.
 * Returns a score (higher = better; contiguous + early matches rank up) or -1.
 */
function fuzzyScore(q: string, text: string): number {
  if (!q) return 0;
  const t = text.toLowerCase();
  let ti = 0, score = 0, streak = 0;
  for (const ch of q.toLowerCase()) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    streak = found === ti ? streak + 1 : 0;
    score += found === ti ? 3 + streak : 1;
    if (found === 0) score += 2; // matches at the very start
    ti = found + 1;
  }
  return score;
}

interface SearchResult {
  key: string;
  label: string;
  sublabel?: string;
  accent: string;
  badge?: string;
  trailing?: string;
  trailingColor?: string;
  score: number;
  run: () => void;
}

/** First letter of the course name, e.g. "Drama" → "D" */
function courseInitial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

/** Readable ink on top of the primary-accent handle/badges (contrast-aware) */
function monoLabelInk(): string {
  return inkOnAccent();
}

const PAGES: Array<{ id: Page; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'grades', label: 'Grades' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'materials', label: 'Materials' },
  { id: 'game', label: 'Grade Breaker' },
  { id: 'nostalgia', label: 'Nostalgia' },
];

const PIN_KEY = '__bs_quicknav_pins__';

export interface QuickPin {
  id: string;
  label: string;
  page: Page;
  courseName?: string;
}

function loadPins(): QuickPin[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PIN_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function savePins(pins: QuickPin[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PIN_KEY, JSON.stringify(pins));
  }
}

interface Props {
  page: Page;
  courseName: string | null;
  courses: ScrapedCourse[];
  onJump: (page: Page, courseName?: string) => void;
}

/**
 * Quick-nav drawer: a left-edge handle (or swipe from the very edge) opens a
 * slide-out rail of jump links — every page, every course gradebook, plus the
 * user's own pinned shortcuts. Lets students hop around without scrolling.
 */
export function QuickNav({ page, courseName, courses, onJump }: Props) {
  const [open, setOpen] = useState(false);
  const [pins, setPins] = useState<QuickPin[]>([]);
  const [starred, setStarred] = useState<StarredFolder[]>([]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef({ x0: 0, on: false });

  useEffect(() => { setPins(loadPins()); }, []);
  // Starred Materials folders live in chrome.storage.local — refresh when the
  // drawer opens so newly-starred folders show without a page reload.
  useEffect(() => {
    if (open) {
      loadStarredFolders().then(setStarred).catch(() => {});
      // Focus the search box so you can type immediately after pressing "g".
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
    }
  }, [open]);

  // Fuzzy results across pages, courses, and every assignment.
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const out: SearchResult[] = [];
    for (const p of PAGES) {
      const s = fuzzyScore(q, p.label);
      if (s >= 0) out.push({ key: `page:${p.id}`, label: p.label, sublabel: 'Page', accent: T.primary, score: s + 1, run: () => jump(p.id) });
    }
    for (const c of courses) {
      const { percent } = parseGradeString(c.grade);
      const s = fuzzyScore(q, c.name);
      if (s >= 0) out.push({
        key: `course:${c.name}`, label: c.name, sublabel: 'Course', accent: courseColor(c.name, true),
        badge: courseInitial(c.name), trailing: percent !== null ? `${percent.toFixed(0)}%` : undefined,
        trailingColor: gradeColor(percent), score: s, run: () => jump('grades', c.name),
      });
      for (const cat of c.categories) {
        for (const a of cat.assignments) {
          const sa = fuzzyScore(q, a.name);
          if (sa >= 0) out.push({
            key: `a:${c.name}:${a.name}`, label: a.name, sublabel: c.name, accent: courseColor(c.name, true),
            badge: courseInitial(c.name), score: sa, run: () => jump('grades', c.name),
          });
        }
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 24);
  }, [query, courses]);

  // Esc closes; "g" opens (skipped while typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
      if (e.key === 'Escape' && open) setOpen(false);
      else if ((e.key === 'g' || e.key === 'G') && !open) setOpen(true);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function jump(p: Page, course?: string) {
    onJump(p, course);
    setOpen(false);
  }

  function jumpFolder(folder: StarredFolder) {
    (window as { __bsPendingFolder?: StarredFolder }).__bsPendingFolder = folder;
    onJump('materials');
    setOpen(false);
  }

  function pinCurrent() {
    const label = courseName && page === 'grades'
      ? courseName
      : PAGES.find((p) => p.id === page)?.label ?? page;
    const id = `${page}|${courseName ?? ''}`;
    if (pins.some((p) => p.id === id)) return;
    const next = [...pins, { id, label, page, courseName: courseName ?? undefined }];
    setPins(next);
    savePins(next);
  }

  function removePin(id: string) {
    const next = pins.filter((p) => p.id !== id);
    setPins(next);
    savePins(next);
  }

  const currentIsPinned = pins.some((p) => p.id === `${page}|${courseName ?? ''}`);

  // Swipe-from-edge: pointer starts in the 14px hotzone, drag right to open
  function onZoneDown(e: React.PointerEvent) {
    dragRef.current = { x0: e.clientX, on: true };
  }
  function onZoneMove(e: React.PointerEvent) {
    if (dragRef.current.on && e.clientX - dragRef.current.x0 > 36) {
      dragRef.current.on = false;
      setOpen(true);
    }
  }

  return (
    <>
      {/* Edge swipe hotzone + discoverable handle */}
      {!open && (
        <div
          onPointerDown={onZoneDown}
          onPointerMove={onZoneMove}
          onPointerUp={() => { dragRef.current.on = false; }}
          style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 18, zIndex: 49 }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open quick navigation (press G)"
            aria-expanded={false}
            className="bs-focusable bs-lift"
            style={{
              all: 'unset',
              position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: 26, height: 92,
              background: T.primary,
              borderRadius: '0 12px 12px 0',
              boxShadow: '3px 0 14px rgba(0,0,0,0.4)',
            }}
            title="Quick nav (press G)"
          >
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '1px',
              color: monoLabelInk(), writingMode: 'vertical-rl', textOrientation: 'mixed',
            }}>
              Jump
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={monoLabelInk()} strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="bs-fade-in"
          style={{ position: 'fixed', inset: 0, zIndex: 51, background: 'rgba(0,0,0,0.35)' }}
        />
      )}

      {/* Drawer */}
      <nav
        aria-label="Quick navigation"
        aria-hidden={!open}
        className="bs-motion"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 52,
          width: 244, maxWidth: '82vw',
          background: T.panel,
          borderRight: `1px solid ${T.border}`,
          boxShadow: open ? '4px 0 28px rgba(0,0,0,0.45)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 220ms cubic-bezier(0.16,1,0.3,1)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          fontFamily: uiFontStack(),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px 8px', position: 'sticky', top: 0, background: T.panel }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.6px', flex: 1 }}>
            Quick Nav
          </span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close quick navigation" className="bs-focusable"
            style={{ all: 'unset', cursor: 'pointer', color: T.muted, padding: 4, display: 'flex', borderRadius: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '4px 12px 8px', position: 'sticky', top: 38, background: T.panel, zIndex: 1 }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { if (query) setQuery(''); else setOpen(false); }
              else if (e.key === 'Enter' && results[0]) results[0].run();
            }}
            placeholder="Search courses, assignments…"
            aria-label="Search"
            style={{
              all: 'unset', boxSizing: 'border-box', width: '100%', padding: '8px 11px',
              fontSize: 12.5, color: T.text, background: T.activeBg,
              border: `1px solid ${T.border}`, borderRadius: 9, fontFamily: uiFontStack(),
            }}
          />
        </div>

        {/* Search results replace the normal sections while typing */}
        {query ? (
          results.length > 0 ? (
            <Section label={`${results.length} result${results.length === 1 ? '' : 's'}`}>
              {results.map((r) => (
                <Row key={r.key} onClick={r.run} label={r.label} accent={r.accent} badge={r.badge}
                  trailing={r.trailing} trailingColor={r.trailingColor} sublabel={r.sublabel} />
              ))}
            </Section>
          ) : (
            <div style={{ padding: '20px 16px', fontSize: 12, color: T.muted, textAlign: 'center' }}>
              No matches for “{query}”.
            </div>
          )
        ) : (
        <>
        {/* Pinned shortcuts */}
        {pins.length > 0 && (
          <Section label="Pinned">
            {pins.map((p) => (
              <Row key={p.id} onClick={() => jump(p.page, p.courseName)}
                accent={p.courseName ? courseColor(p.courseName, true) : T.primary}
                label={p.label}
                onRemove={() => removePin(p.id)}
              />
            ))}
          </Section>
        )}

        {/* Pages */}
        <Section label="Pages">
          {PAGES.map((p) => (
            <Row key={p.id} onClick={() => jump(p.id)} label={p.label}
              accent={T.primary} active={page === p.id && !courseName} />
          ))}
        </Section>

        {/* Starred Materials folders → jump straight into the folder */}
        {starred.length > 0 && (
          <Section label="Starred">
            {starred.map((f) => (
              <Row key={f.href} onClick={() => jumpFolder(f)}
                accent={courseColor(f.courseName, true)}
                badge={courseInitial(f.courseName)}
                label={f.title}
                trailing="★"
                trailingColor={T.primary}
              />
            ))}
          </Section>
        )}

        {/* Courses → jump straight to gradebook */}
        {courses.length > 0 && (
          <Section label="Courses">
            {courses.map((c) => {
              const { percent } = parseGradeString(c.grade);
              return (
                <Row key={c.name} onClick={() => jump('grades', c.name)}
                  accent={courseColor(c.name, true)}
                  badge={courseInitial(c.name)}
                  label={c.name}
                  active={page === 'grades' && courseName === c.name}
                  trailing={percent !== null ? `${percent.toFixed(0)}%` : undefined}
                  trailingColor={gradeColor(percent)}
                />
              );
            })}
          </Section>
        )}
        </>
        )}

        {/* Pin current view */}
        <div style={{ padding: '10px 14px 18px', marginTop: 'auto' }}>
          <button type="button" onClick={pinCurrent} disabled={currentIsPinned} className="bs-focusable"
            style={{
              all: 'unset', boxSizing: 'border-box', width: '100%', textAlign: 'center',
              cursor: currentIsPinned ? 'default' : 'pointer',
              fontSize: 11, fontWeight: 600,
              color: currentIsPinned ? T.muted : T.primary,
              border: `1px dashed ${currentIsPinned ? T.border : T.primary + '60'}`,
              borderRadius: 8, padding: '8px 0',
            }}
            title="Pin where you are now for one-tap return">
            {currentIsPinned ? '✓ Current view pinned' : '+ Pin current view'}
          </button>
        </div>
      </nav>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '4px 8px 8px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, opacity: 0.8, letterSpacing: '0.5px', padding: '6px 6px 4px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ onClick, label, accent, badge, active, trailing, trailingColor, onRemove, sublabel }: {
  onClick: () => void;
  label: string;
  accent: string;
  badge?: string;
  active?: boolean;
  trailing?: string;
  trailingColor?: string;
  onRemove?: () => void;
  sublabel?: string;
}) {
  return (
    <div className="bs-reveal-parent" style={{ position: 'relative' }}>
      <button type="button" onClick={onClick} aria-current={active ? 'true' : undefined} className="bs-focusable"
        style={{
          all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 9, width: '100%',
          padding: '8px 8px', borderRadius: 8, marginBottom: 1,
          background: active ? T.activeBg : 'transparent',
        }}>
        {badge ? (
          <span aria-hidden="true" style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: monoLabelInk(),
          }}>
            {badge}
          </span>
        ) : (
          <span aria-hidden="true" style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: accent }} />
        )}
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
          {sublabel && (
            <span style={{ fontSize: 10, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sublabel}
            </span>
          )}
        </span>
        {trailing && (
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: trailingColor ?? T.muted, fontVariantNumeric: 'tabular-nums' }}>
            {trailing}
          </span>
        )}
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Unpin ${label}`} className="bs-reveal bs-focusable"
          style={{ all: 'unset', position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)', cursor: 'pointer', color: T.muted, fontSize: 13, padding: '2px 5px', borderRadius: 4, background: T.panel }}>
          ×
        </button>
      )}
    </div>
  );
}
