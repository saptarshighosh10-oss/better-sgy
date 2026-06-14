/**
 * ExtRouter.tsx — Phase 3A
 *
 * Full-screen layout shell: sidebar nav + page content.
 * The root component rendered by App.tsx.
 */

import React, { useState } from 'react';
import { useExtensionGrades } from '../lib/use-extension-grades';
import type { ScrapeResult } from '../lib/scrape-status';
import { FloatingNav } from './FloatingNav';
import { QuickNav } from './QuickNav';
import { ConnectionBanner } from './ConnectionBanner';
import { CommandPalette } from './CommandPalette';
import { GradeTransfer } from './GradeTransfer';
import { OverviewPage } from './pages/OverviewPage';
import { GradesPage } from './pages/GradesPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { CalendarPage } from './pages/CalendarPage';
import { GameHub } from './pages/GameHub';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { NostalgiaPage } from './pages/NostalgiaPage';
import { type GradeSnapshot } from '../lib/storage';
import { useAnnouncements } from '../lib/use-announcements';
import { T, inkOnAccent, uiFontStack } from '../lib/theme';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export type Page = 'overview' | 'grades' | 'assignments' | 'calendar' | 'materials' | 'game' | 'announcements' | 'nostalgia';

/** Same order as the FloatingNav carousel — the Arcade (game) sits last so it's the
 *  final page you scroll to. */
const PAGE_ORDER: Page[] = ['overview', 'grades', 'assignments', 'calendar', 'materials', 'announcements', 'nostalgia', 'game'];

const IN_PROGRESS = new Set([
  'checking_session',
  'scraping_live_dom',
  'fetching_grade_page',
  'parsing',
  'validating',
  'saving',
]);

const BASE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: T.bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  zIndex: 1,
  flexDirection: 'column',
  gap: 12,
  textAlign: 'center',
  padding: 32,
};

interface Props {
  scrapeResult: ScrapeResult;
}

/** Starting-screen loader: two concentric counter-rotating accent rings. */
function BootRings() {
  return (
    <div style={{ position: 'relative', width: 58, height: 58, marginBottom: 4 }} aria-hidden="true">
      <span
        className="bs-boot-ring"
        style={{
          inset: 0,
          border: `3px solid ${T.border}`,
          borderTopColor: T.primary,
          animation: 'bsSpin 0.9s linear infinite',
        }}
      />
      <span
        className="bs-boot-ring"
        style={{
          inset: 11,
          border: `3px solid ${T.border}`,
          borderBottomColor: T.primary,
          animation: 'bsSpinRev 0.7s linear infinite',
        }}
      />
    </div>
  );
}

const PAGE_KEY = '__bs_page__';
const COURSE_KEY = '__bs_course__';

export function ExtRouter({ scrapeResult }: Props) {
  const grades = useExtensionGrades();
  // Restore the page (and selected course) the user was on before a reload.
  const [page, setPage] = useState<Page>(() => {
    if (typeof localStorage === 'undefined') return 'overview';
    const saved = localStorage.getItem(PAGE_KEY) as Page | null;
    return saved && PAGE_ORDER.includes(saved) ? saved : 'overview';
  });
  const [selectedCourseName, setSelectedCourseName] = useState<string | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(COURSE_KEY);
  });
  const [themeTick, setThemeTick] = useState(0);

  // Persist page + course so a reload lands where the user left off.
  React.useEffect(() => {
    try { localStorage.setItem(PAGE_KEY, page); } catch { /* storage blocked */ }
  }, [page]);
  React.useEffect(() => {
    try {
      if (selectedCourseName) localStorage.setItem(COURSE_KEY, selectedCourseName);
      else localStorage.removeItem(COURSE_KEY);
    } catch { /* storage blocked */ }
  }, [selectedCourseName]);
  const [activeSnapshot, setActiveSnapshot] = useState<GradeSnapshot | null>(null);
  const announcements = useAnnouncements(grades.courses ?? []);
  const reduceMotion = useReducedMotion();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K opens global search from anywhere in the overlay.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Mirror the unread count onto the native-Schoology "Show Better Schoology" button
  // so it pings while you're on native Schoology; expose markAllSeen so returning
  // to the overlay clears it ("stops until you view Schoology again").
  React.useEffect(() => {
    (window as { __bsSetEscapeBadge?: (n: number) => void }).__bsSetEscapeBadge?.(announcements.unreadCount);
  }, [announcements.unreadCount]);
  React.useEffect(() => {
    (window as { __bsAckUpdates?: () => void }).__bsAckUpdates = announcements.markAllSeen;
    return () => { delete (window as { __bsAckUpdates?: () => void }).__bsAckUpdates; };
  }, [announcements.markAllSeen]);

  React.useEffect(() => {
    (window as any).__triggerThemeChange = () => {
      setThemeTick((t) => t + 1);
    };
    return () => {
      delete (window as any).__triggerThemeChange;
    };
  }, []);

  // Global ←/→ cycles through pages in a full loop. Skipped while typing, while the
  // overview carousel is focused, and only while a game is actively being PLAYED
  // (the arcade hub sets __bsGameActive when a cabinet game is launched, so the
  // SELECT GAME menu still lets you arrow-key away — Caveman/Neon keep arrows in-game).
  const pageRef = React.useRef(page);
  pageRef.current = page;
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (pageRef.current === 'game' && (window as { __bsGameActive?: boolean }).__bsGameActive) return;
      const target = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      setPage((p) => {
        const i = Math.max(0, PAGE_ORDER.indexOf(p));
        return e.key === 'ArrowRight'
          ? PAGE_ORDER[(i + 1) % PAGE_ORDER.length]
          : PAGE_ORDER[(i - 1 + PAGE_ORDER.length) % PAGE_ORDER.length];
      });
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function navigate(p: Page, courseName?: string) {
    setPage(p);
    if (courseName !== undefined) setSelectedCourseName(courseName);
  }

  // Bell toggle: open Announcements, or — if already there — go back to the page
  // you came from (press it again to "leave it").
  const prevPageRef = React.useRef<Page>('overview');
  function toggleAnnouncements() {
    setPage((p) => {
      if (p === 'announcements') return prevPageRef.current;
      prevPageRef.current = p;
      return 'announcements';
    });
  }

  // Loading
  if (grades.loading) {
    return (
      <div style={BASE} role="status" aria-busy="true">
        <BootRings />
        <span style={{ color: T.muted, fontSize: 13 }}>Loading your dashboard…</span>
      </div>
    );
  }

  // No data yet
  if (!grades.data) {
    const isInProgress = IN_PROGRESS.has(scrapeResult.status);
    const isFailed = scrapeResult.status === 'failed';
    // "Must have at least 1 course" usually just means the current term is empty
    // (e.g. over summer) — not a real failure. Show calm copy for that case.
    const emptyTerm = !!scrapeResult.error && /at least 1 course|at least one course/i.test(scrapeResult.error);
    return (
      <div style={BASE} role="status">
        {isInProgress && <BootRings />}
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text, maxWidth: 440 }}>
          {isInProgress
            ? 'Reading grades from Schoology…'
            : emptyTerm
            ? 'No active courses this term'
            : isFailed
            ? "Couldn't read your grades"
            : 'No saved grades yet'}
        </div>
        {isFailed && scrapeResult.error && !emptyTerm && (
          <div style={{ fontSize: 12, color: T.failed, maxWidth: 400, lineHeight: 1.6 }}>
            {scrapeResult.error}
          </div>
        )}
        {!isInProgress && (
          <>
            <div style={{ fontSize: 12, color: T.muted, maxWidth: 420, lineHeight: 1.6 }}>
              {emptyTerm
                ? 'Schoology has no graded courses for the current grading period (this is normal over breaks). Open your Grades page to load a term that has them — or restore a backup you saved earlier.'
                : 'Open your Schoology grades page once and the extension reads it automatically — or restore a backup you saved on another device.'}
            </div>
            <a
              href="/grades/grades"
              className="bs-focusable"
              style={{
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: T.primary,
                color: inkOnAccent(),
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                padding: '10px 18px',
                textDecoration: 'none',
              }}
            >
              Open the Grades page
            </a>
            <GradeTransfer variant="inline" />
          </>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: T.bg,
        display: 'flex',
        fontFamily: uiFontStack(),
        color: T.text,
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <AnimatePresence mode="wait">
          <motion.main
            key={page}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              paddingBottom: 84,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {page === 'overview' && (
              <OverviewPage
                grades={grades}
                onCourseSelect={(name) => navigate('grades', name)}
              />
            )}
            {page === 'grades' && (
              <GradesPage
                grades={grades}
                selectedCourseName={selectedCourseName}
                onCourseSelect={setSelectedCourseName}
                activeSnapshot={activeSnapshot}
                setActiveSnapshot={setActiveSnapshot}
              />
            )}
            {page === 'assignments' && <AssignmentsPage grades={grades} />}
            {page === 'calendar' && <CalendarPage grades={grades} />}
            {page === 'materials' && <MaterialsPage grades={grades} />}
            {page === 'game' && <GameHub grades={grades} />}
            {page === 'announcements' && <AnnouncementsPage announcements={announcements} />}
            {page === 'nostalgia' && (
              <NostalgiaPage
                grades={grades}
                onViewSnapshot={(snap) => {
                  setActiveSnapshot(snap);
                  navigate('grades', snap.courses[0]?.name);
                }}
              />
            )}
          </motion.main>
        </AnimatePresence>
      </div>

      <FloatingNav page={page} onNavigate={(p) => navigate(p)} announcementsUnread={announcements.unreadCount} onBell={toggleAnnouncements} onSearch={() => setPaletteOpen(true)} />
      <QuickNav
        page={page}
        courseName={selectedCourseName}
        courses={grades.courses}
        onJump={(p, courseName) => navigate(p, courseName)}
      />
      <ConnectionBanner />
      <GradeTransfer variant="pill" />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        courses={grades.courses ?? []}
        announcements={announcements.items}
        onNavigate={(p, courseName) => navigate(p, courseName)}
      />
    </div>
  );
}
