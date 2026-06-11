/**
 * use-extension-grades.ts — Phase 2
 *
 * React hook that reads grade data from chrome.storage.local and
 * auto-refreshes when storage changes (e.g. after a scrape completes).
 */

import { useState, useEffect } from 'react';
import { loadGradeData, loadLastGoodData, loadScrapeMeta, loadSnapshots } from './storage';
import { loadGradeHistory } from './grade-history';
import type { ScrapeMeta } from './storage';
import type { SchoologyData, ScrapedCourse } from './schemas';

/**
 * How much data we actually have to show. At end of term Schoology wipes the
 * per-assignment gradebook but keeps the overall course grade — the UI adapts:
 *   'full'      — assignments exist; everything renders as normal
 *   'graphOnly' — no assignments, but grade history / a snapshot survives →
 *                 show trend graphs, hide all assignment lists
 *   'gradeOnly' — only the bare course grades exist → grades + caption, no
 *                 graph, no assignment lists
 *   'empty'     — nothing at all → clean empty state
 */
export type GradesMode = 'full' | 'graphOnly' | 'gradeOnly' | 'empty';

export interface ExtensionGradesState {
  loading: boolean;
  data: SchoologyData | null;
  meta: ScrapeMeta | null;
  usingFallback: boolean;
  courses: ScrapedCourse[];
  courseCount: number;
  assignmentCount: number;
  lastScrapedAt: number | null;
  // ── derived "how much data exists" signals ──
  hasCourses: boolean;
  hasAssignments: boolean;
  hasHistory: boolean;
  mode: GradesMode;
}

function countAll(courses: ScrapedCourse[]): number {
  return courses.reduce(
    (sum, c) => sum + c.categories.reduce((s, cat) => s + cat.assignments.length, 0),
    0
  );
}

function anyAssignments(courses: ScrapedCourse[]): boolean {
  return courses.some((c) => c.categories.some((cat) => cat.assignments.length > 0));
}

function deriveMode(hasCourses: boolean, hasAssignments: boolean, hasHistory: boolean): GradesMode {
  if (!hasCourses) return 'empty';
  if (hasAssignments) return 'full';
  return hasHistory ? 'graphOnly' : 'gradeOnly';
}

export function useExtensionGrades(): ExtensionGradesState {
  const [state, setState] = useState<ExtensionGradesState>({
    loading: true,
    data: null,
    meta: null,
    usingFallback: false,
    courses: [],
    courseCount: 0,
    assignmentCount: 0,
    lastScrapedAt: null,
    hasCourses: false,
    hasAssignments: false,
    hasHistory: false,
    mode: 'empty',
  });

  useEffect(() => {
    async function load() {
      try {
        const [data, meta, lastGood, history, snapshots] = await Promise.all([
          loadGradeData(),
          loadScrapeMeta(),
          loadLastGoodData(),
          loadGradeHistory(),
          loadSnapshots(),
        ]);

        let resolvedData = data;
        let usingFallback = false;
        if (!resolvedData) {
          resolvedData = lastGood;
          usingFallback = !!resolvedData;
        }

        const courses = resolvedData?.courses ?? [];
        const hasCourses = courses.length > 0;
        const hasAssignments = anyAssignments(courses);
        // History survives the end-of-term wipe if: the grade-history log has
        // points, OR the student saved a snapshot, OR last-good still has the
        // assignment-level data.
        const hasHistory =
          Object.values(history).some((pts) => pts.length > 0) ||
          snapshots.length > 0 ||
          (!!lastGood && anyAssignments(lastGood.courses));

        setState({
          loading: false,
          data: resolvedData,
          meta,
          usingFallback,
          courses,
          courseCount: courses.length,
          assignmentCount: countAll(courses),
          lastScrapedAt: resolvedData?.scrapedAt ?? meta?.scrapedAt ?? null,
          hasCourses,
          hasAssignments,
          hasHistory,
          mode: deriveMode(hasCourses, hasAssignments, hasHistory),
        });
      } catch (err) {
        console.error('[BS] useExtensionGrades error:', err);
        setState((prev) => ({ ...prev, loading: false }));
      }
    }

    void load();

    const onChanged = (changes: Record<string, unknown>, areaName: string) => {
      if (areaName === 'local' && ('bs_grade_data' in changes || 'bs_scrape_meta' in changes)) {
        void load();
      }
    };

    browser.storage.onChanged.addListener(onChanged);
    return () => {
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  return state;
}
