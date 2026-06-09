/**
 * ExtRouter.tsx — Phase 3A
 *
 * Full-screen layout shell: sidebar nav + page content.
 * Replaces MiniDashboard as the root component rendered by App.tsx.
 */

import React, { useState } from 'react';
import { useExtensionGrades } from '../lib/use-extension-grades';
import type { ScrapeResult } from '../lib/scrape-status';
import { ExtSidebar } from './ExtSidebar';
import { OverviewPage } from './pages/OverviewPage';
import { GradesPage } from './pages/GradesPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { MaterialsPage } from './pages/MaterialsPage';

export type Page = 'overview' | 'grades' | 'assignments' | 'materials';

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
  background: '#0b0e17',
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

export function ExtRouter({ scrapeResult }: Props) {
  const grades = useExtensionGrades();
  const [page, setPage] = useState<Page>('overview');
  const [selectedCourseName, setSelectedCourseName] = useState<string | null>(null);

  function navigate(p: Page, courseName?: string) {
    setPage(p);
    if (courseName !== undefined) setSelectedCourseName(courseName);
  }

  // Loading
  if (grades.loading) {
    return (
      <div style={BASE}>
        <span style={{ color: '#7a8ea3', fontSize: 13 }}>Loading…</span>
      </div>
    );
  }

  // No data yet
  if (!grades.data) {
    const isInProgress = IN_PROGRESS.has(scrapeResult.status);
    return (
      <div style={BASE}>
        <div style={{ fontSize: 15, color: '#7a8ea3', maxWidth: 400 }}>
          {isInProgress
            ? 'Reading grades from Schoology…'
            : 'No saved grades yet. Visit the Grades page first.'}
        </div>
        {!isInProgress && (
          <div style={{ fontSize: 12, color: '#2a3a52', maxWidth: 380, lineHeight: 1.6 }}>
            Navigate to{' '}
            <span style={{ color: '#3b82f6', fontWeight: 600 }}>
              {location.host}/grades/grades
            </span>{' '}
            — the extension will read your grades automatically.
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0b0e17',
        display: 'flex',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: '#e8eaf0',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      <ExtSidebar
        page={page}
        onNavigate={(p) => navigate(p)}
        grades={grades}
        scrapeResult={scrapeResult}
      />

      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0, position: 'relative' }}>
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
          />
        )}
        {page === 'assignments' && <AssignmentsPage grades={grades} />}
        {page === 'materials' && <MaterialsPage grades={grades} />}
      </main>
    </div>
  );
}
