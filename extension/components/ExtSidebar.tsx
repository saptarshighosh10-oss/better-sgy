import React from 'react';
import type { Page } from './ExtRouter';
import type { ScrapeResult } from '../lib/scrape-status';
import type { ScrapedCourse } from '../lib/schemas';
import { isMissing } from '../lib/grade-utils';

const T = {
  sidebar: '#0e1120',
  border: '#1a2030',
  active: '#1a2540',
  text: '#c8d5e8',
  muted: '#4d5f7a',
  faint: '#2a3a52',
  primary: '#3b82f6',
  fresh: '#22c55e',
  stale: '#f59e0b',
  failed: '#ef4444',
} as const;

interface GradesState {
  courses: ScrapedCourse[];
  data: { gradingPeriod: string } | null;
  meta: { status: string } | null;
  loading: boolean;
  usingFallback: boolean;
  courseCount: number;
  assignmentCount: number;
  lastScrapedAt: number | null;
}

interface Props {
  page: Page;
  onNavigate: (p: Page) => void;
  grades: GradesState;
  scrapeResult: ScrapeResult;
}

const NAV_ITEMS: Array<{ id: Page; label: string; d: string }> = [
  {
    id: 'overview',
    label: 'Overview',
    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'grades',
    label: 'Grades',
    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'assignments',
    label: 'Assignments',
    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4',
  },
  {
    id: 'materials',
    label: 'Materials',
    d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  },
];

const IN_PROGRESS_STATUSES = new Set([
  'checking_session',
  'scraping_live_dom',
  'fetching_grade_page',
  'parsing',
  'validating',
  'saving',
]);

function resolveStatus(
  scrapeResult: ScrapeResult,
  meta: { status: string } | null,
): { color: string; label: string } {
  const s = scrapeResult.status !== 'idle' ? scrapeResult.status : (meta?.status ?? 'idle');
  if (s === 'fresh') return { color: T.fresh, label: 'Fresh' };
  if (s === 'stale') return { color: T.stale, label: 'Stale' };
  if (s === 'failed') return { color: T.failed, label: 'Failed' };
  if (IN_PROGRESS_STATUSES.has(s)) return { color: T.primary, label: 'Reading…' };
  return { color: T.muted, label: 'Idle' };
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}

export function ExtSidebar({ page, onNavigate, grades, scrapeResult }: Props) {
  const { color: dotColor, label: dotLabel } = resolveStatus(scrapeResult, grades.meta);

  const missingCount = grades.courses
    .flatMap((c) => c.categories.flatMap((cat) => cat.assignments))
    .filter(isMissing).length;

  const period = (grades.data?.gradingPeriod ?? '')
    .replace(/\s*grading\s+period\s*/gi, '')
    .trim();

  return (
    <nav
      style={{
        width: 240,
        flexShrink: 0,
        background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Logo header */}
      <div
        style={{
          padding: '14px 16px 12px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: '#1d2b4f',
            border: '1px solid #2a3f72',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: T.primary,
              letterSpacing: '-0.3px',
            }}
          >
            BS
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.text,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Better Schoology
          </div>
          <div
            style={{
              fontSize: 10,
              color: T.muted,
              lineHeight: 1.2,
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {period || 'Extension'}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ padding: '8px 8px', flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: T.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '6px 8px 4px',
          }}
        >
          Navigation
        </div>
        {NAV_ITEMS.map(({ id, label, d }) => {
          const active = page === id;
          const showBadge = id === 'assignments' && missingCount > 0;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{
                all: 'unset',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                color: active ? T.primary : T.text,
                background: active ? T.active : 'transparent',
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                marginBottom: 1,
                boxSizing: 'border-box',
              }}
            >
              <Icon d={d} />
              <span style={{ flex: 1 }}>{label}</span>
              {showBadge && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: '#ef444420',
                    color: '#ef4444',
                    border: '1px solid #ef444430',
                    borderRadius: 9,
                    padding: '1px 6px',
                    lineHeight: 1.4,
                  }}
                >
                  {missingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status footer */}
      <div
        style={{
          padding: '10px 14px 14px',
          borderTop: `1px solid ${T.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, color: T.muted }}>{dotLabel}</span>
          {grades.lastScrapedAt && (
            <span style={{ fontSize: 10, color: T.faint, marginLeft: 'auto' }}>
              {new Date(grades.lastScrapedAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
        {grades.usingFallback && (
          <div style={{ fontSize: 10, color: T.stale, marginTop: 4 }}>⚠ using cached data</div>
        )}
        {grades.courseCount > 0 && (
          <div style={{ fontSize: 10, color: T.faint, marginTop: 3 }}>
            {grades.courseCount} courses · {grades.assignmentCount} assignments
          </div>
        )}
      </div>
    </nav>
  );
}
