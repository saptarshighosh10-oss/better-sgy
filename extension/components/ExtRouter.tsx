/**
 * ExtRouter.tsx — Phase 3A
 *
 * Full-screen layout shell: sidebar nav + page content.
 * Replaces MiniDashboard as the root component rendered by App.tsx.
 */

import React, { useState } from 'react';
import { useExtensionGrades } from '../lib/use-extension-grades';
import type { ScrapeResult } from '../lib/scrape-status';
import { FloatingNav } from './FloatingNav';
import { QuickNav } from './QuickNav';
import { OverviewPage } from './pages/OverviewPage';
import { GradesPage } from './pages/GradesPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { CalendarPage } from './pages/CalendarPage';
import { GameHub } from './pages/GameHub';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { NostalgiaPage } from './pages/NostalgiaPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardSkeleton } from './DashboardSkeleton';
import { seedDemoData } from '../lib/demo-data';
import { type GradeSnapshot } from '../lib/storage';
import { useAnnouncements } from '../lib/use-announcements';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from '../lib/settings';
import { T, uiFontStack } from '../lib/theme';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Page } from '../lib/pages';

export type { Page };

const DEFAULT_TAB_ORDER: Page[] = ['overview', 'grades', 'assignments', 'calendar', 'materials', 'announcements', 'nostalgia', 'game'];

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
const PAGE_KEY = '__bs_page__';
const COURSE_KEY = '__bs_course__';

export function ExtRouter({ scrapeResult }: Props) {
  const grades = useExtensionGrades();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
    const unsub = (() => {
      const handler = (_c: Record<string, unknown>, area: string) => {
        if (area === 'local') loadSettings().then(setSettings).catch(() => {});
      };
      browser.storage.onChanged.addListener(handler);
      return () => browser.storage.onChanged.removeListener(handler);
    })();
    return unsub;
  }, []);

  // Effective tab order: user's saved order, filtered to remove hidden tabs.
  const pageOrder = React.useMemo<Page[]>(() => {
    const order = (settings.tabOrder.length > 0 ? settings.tabOrder : DEFAULT_TAB_ORDER) as Page[];
    const hidden = new Set(settings.hiddenTabs);
    return order.filter((p) => !hidden.has(p));
  }, [settings.tabOrder, settings.hiddenTabs]);

  // Restore the page (and selected course) the user was on before a reload.
  const [page, setPage] = useState<Page>(() => {
    if (typeof localStorage === 'undefined') return 'overview';
    const saved = localStorage.getItem(PAGE_KEY) as Page | null;
    return saved && (DEFAULT_TAB_ORDER.includes(saved) || saved === 'settings') ? saved : 'overview';
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
  const pageOrderRef = React.useRef(pageOrder);
  pageOrderRef.current = pageOrder;
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (pageRef.current === 'game' && (window as { __bsGameActive?: boolean }).__bsGameActive) return;
      if (pageRef.current === 'settings') return;
      const target = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      setPage((p) => {
        const ord = pageOrderRef.current;
        const i = Math.max(0, ord.indexOf(p));
        return e.key === 'ArrowRight'
          ? ord[(i + 1) % ord.length]
          : ord[(i - 1 + ord.length) % ord.length];
      });
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const saveSettingsAndApply = React.useCallback(async (patch: Partial<Settings>): Promise<Settings> => {
    const next = await saveSettings(patch);
    setSettings(next);
    return next;
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

  function toggleSettings() {
    setPage((p) => {
      if (p === 'settings') return prevPageRef.current;
      prevPageRef.current = p;
      return 'settings';
    });
  }

  // Loading — show a skeleton mirror of the dashboard rather than a bare spinner.
  if (grades.loading) {
    return <div role="status" aria-busy="true"><DashboardSkeleton /></div>;
  }

  // No data yet
  if (!grades.data) {
    const isInProgress = IN_PROGRESS.has(scrapeResult.status);
    const isFailed = scrapeResult.status === 'failed';
    // While the first scrape is running, the skeleton reads better than a spinner.
    if (isInProgress) {
      return <div role="status" aria-busy="true"><DashboardSkeleton /></div>;
    }
    return (
      <div style={BASE} role="status">
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text, maxWidth: 420 }}>
          {isInProgress
            ? 'Reading grades from Schoology…'
            : isFailed
            ? "Couldn't read your grades"
            : 'No saved grades yet'}
        </div>
        {isFailed && scrapeResult.error && (
          <div style={{ fontSize: 12, color: T.failed, maxWidth: 400, lineHeight: 1.6 }}>
            {scrapeResult.error}
          </div>
        )}
        {!isInProgress && (
          <>
            <div style={{ fontSize: 12, color: T.muted, maxWidth: 400, lineHeight: 1.6 }}>
              Open your Schoology grades page once and the extension reads it automatically.
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
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                padding: '10px 18px',
                textDecoration: 'none',
              }}
            >
              Open the Grades page
            </a>
            <button
              type="button"
              className="bs-focusable"
              onClick={() => { void seedDemoData(); }}
              style={{
                marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'transparent', color: T.muted, fontSize: 12, fontWeight: 600,
                border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
              }}
            >
              Load demo data (for testing)
            </button>
          </>
        )}
      </div>
    );
  }

  const isSlate = settings.edition === 'slate';
  const isForge = settings.edition === 'forge';

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
        ...(isSlate ? { filter: 'grayscale(1) saturate(0)' } : {}),
      }}
    >
      <div style={{ flex: 1, position: 'relative', minWidth: 0, ...(isForge ? { zoom: 0.92 } : {}) }}>
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
            {page === 'settings' && (
              <SettingsPage
                settings={settings}
                onSave={saveSettingsAndApply}
                data={grades.data}
              />
            )}
          </motion.main>
        </AnimatePresence>
      </div>

      <FloatingNav
        page={page}
        onNavigate={(p) => navigate(p)}
        announcementsUnread={announcements.unreadCount}
        onBell={toggleAnnouncements}
        onSettings={toggleSettings}
        pageOrder={pageOrder}
      />
      <QuickNav
        page={page}
        courseName={selectedCourseName}
        courses={grades.courses}
        onJump={(p, courseName) => navigate(p, courseName)}
        pageOrder={pageOrder}
      />
    </div>
  );
}
