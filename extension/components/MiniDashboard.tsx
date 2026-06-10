/**
 * MiniDashboard.tsx — Phase 2
 *
 * Full-screen dashboard rendered inside the Shadow DOM overlay.
 * Reads grade data from chrome.storage.local via useExtensionGrades hook.
 * Displays course list, selected gradebook, assignment preview, and grade bars.
 */

import React, { useState } from 'react';
import { useExtensionGrades } from '../lib/use-extension-grades';
import { CourseCards } from './CourseCards';
import { CourseGradebook } from './CourseGradebook';
import { AssignmentsPreview } from './AssignmentsPreview';
import { CurrentGradesMiniGraph } from './CurrentGradesMiniGraph';
import type { ScrapeResult } from '../lib/scrape-status';

import { T } from '../lib/theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === 'fresh') return T.fresh;
  if (status === 'stale') return T.stale;
  if (status === 'failed') return T.failed;
  return T.muted;
}

function statusLabel(status: string): string {
  if (status === 'fresh') return 'Fresh';
  if (status === 'stale') return 'Stale';
  if (status === 'failed') return 'Failed';
  if (status === 'idle') return 'Idle';
  return 'Reading…';
}

function isInProgress(status: string): boolean {
  return ['checking_session', 'scraping_live_dom', 'fetching_grade_page', 'parsing', 'validating', 'saving'].includes(status);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  scrapeResult: ScrapeResult;
}

export function MiniDashboard({ scrapeResult }: Props) {
  const grades = useExtensionGrades();
  const [selectedCourseName, setSelectedCourseName] = useState<string | null>(null);

  const selectedCourse = grades.courses.find((c) => c.name === selectedCourseName) ?? null;

  // Effective status: if live scrape has run this session, use that; otherwise fall back to stored meta
  const effectiveStatus =
    scrapeResult.status !== 'idle' ? scrapeResult.status : (grades.meta?.status ?? 'idle');

  const chipColor = statusColor(effectiveStatus);
  const chipLabel = statusLabel(effectiveStatus);

  const scrapedTime = grades.lastScrapedAt
    ? new Date(grades.lastScrapedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  function handleSelect(name: string) {
    setSelectedCourseName((prev) => (prev === name ? null : name));
  }

  // ── Empty state (no data at all) ─────────────────────────────────────────────
  if (!grades.loading && !grades.data) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: T.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          color: T.text,
          zIndex: 1,
          gap: 12,
          textAlign: 'center',
          padding: 32,
        }}
      >
        <div style={{ fontSize: 15, color: T.muted, maxWidth: 400 }}>
          {isInProgress(scrapeResult.status)
            ? 'Reading grades from Schoology…'
            : 'No saved grades yet. Visit the Grades page first.'}
        </div>
        <div style={{ fontSize: 12, color: T.faint, maxWidth: 380, lineHeight: 1.6 }}>
          Navigate to{' '}
          <span style={{ color: T.accent, fontWeight: 600 }}>
            {location.host}/grades/grades
          </span>{' '}
          — the extension will read your grades automatically.
        </div>
      </div>
    );
  }

  // ── Main dashboard ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: T.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: T.text,
        zIndex: 1,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: T.header,
          borderBottom: `1px solid ${T.border}`,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 50,
          flexShrink: 0,
          gap: 16,
        }}
      >
        {/* Left: title + path + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, flexShrink: 0 }}>
            Better Schoology
          </span>

          <span
            style={{
              fontSize: 10,
              color: T.faint,
              background: '#151d2e',
              borderRadius: 4,
              padding: '2px 7px',
              flexShrink: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 220,
            }}
          >
            {window.location.pathname}
          </span>

          {/* Status chip */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 9px',
              borderRadius: 4,
              background: chipColor + '1a',
              color: chipColor,
              border: `1px solid ${chipColor}33`,
              flexShrink: 0,
            }}
          >
            {chipLabel}
          </span>

          {grades.usingFallback && (
            <span style={{ fontSize: 10, color: T.stale, flexShrink: 0 }}>⚠ cached</span>
          )}

          {scrapeResult.error && (
            <span
              style={{
                fontSize: 10,
                color: T.failed,
                flexShrink: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 180,
              }}
            >
              {scrapeResult.error}
            </span>
          )}
        </div>

        {/* Right: counts + time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexShrink: 0,
          }}
        >
          {grades.courseCount > 0 && (
            <span style={{ fontSize: 12, color: T.muted }}>
              {grades.courseCount} courses · {grades.assignmentCount} assignments
            </span>
          )}
          {scrapedTime && (
            <span style={{ fontSize: 11, color: T.faint }}>Last read {scrapedTime}</span>
          )}

          {/* Stale/failure note */}
          {grades.meta?.status === 'failed' && (
            <span style={{ fontSize: 11, color: T.failed }}>
              Couldn't read grades — showing last saved version.
            </span>
          )}
          {grades.meta?.status === 'stale' && grades.data && (
            <span style={{ fontSize: 11, color: T.stale }}>
              Showing last saved grades from {scrapedTime ?? '—'}.
            </span>
          )}
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {grades.loading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: T.muted, fontSize: 13 }}>Loading…</span>
        </div>
      ) : (
        /* ── Content ────────────────────────────────────────────────── */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar: course list */}
          <div
            style={{
              width: 288,
              borderRight: `1px solid ${T.border}`,
              overflowY: 'auto',
              padding: '12px 10px',
              flexShrink: 0,
              background: T.sidebar,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.faint,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 8,
                paddingLeft: 3,
              }}
            >
              Courses · {(grades.data?.gradingPeriod ?? '').replace(/\s*grading\s+period\s*/gi, '').trim()}
            </div>
            <CourseCards
              courses={grades.courses}
              selectedCourseName={selectedCourseName}
              onSelect={handleSelect}
            />
          </div>

          {/* Main panel */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {selectedCourse ? (
              <>
                <button
                  onClick={() => setSelectedCourseName(null)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: T.accent,
                    marginBottom: 14,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  ← All courses
                </button>
                <CourseGradebook course={selectedCourse} />
              </>
            ) : (
              <>
                <CurrentGradesMiniGraph courses={grades.courses} />
                <AssignmentsPreview courses={grades.courses} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
