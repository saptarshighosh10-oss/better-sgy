/**
 * use-extension-grades.ts — Phase 2
 *
 * React hook that reads grade data from chrome.storage.local and
 * auto-refreshes when storage changes (e.g. after a scrape completes).
 */

import { useState, useEffect } from 'react';
import { loadGradeData, loadLastGoodData, loadScrapeMeta } from './storage';
import type { ScrapeMeta } from './storage';
import type { SchoologyData, ScrapedCourse } from './schemas';

export interface ExtensionGradesState {
  loading: boolean;
  data: SchoologyData | null;
  meta: ScrapeMeta | null;
  usingFallback: boolean;
  courses: ScrapedCourse[];
  courseCount: number;
  assignmentCount: number;
  lastScrapedAt: number | null;
}

function countAll(courses: ScrapedCourse[]): number {
  return courses.reduce(
    (sum, c) => sum + c.categories.reduce((s, cat) => s + cat.assignments.length, 0),
    0
  );
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
  });

  useEffect(() => {
    async function load() {
      try {
        const [data, meta] = await Promise.all([loadGradeData(), loadScrapeMeta()]);

        let resolvedData = data;
        let usingFallback = false;
        if (!resolvedData) {
          resolvedData = await loadLastGoodData();
          usingFallback = !!resolvedData;
        }

        const courses = resolvedData?.courses ?? [];
        setState({
          loading: false,
          data: resolvedData,
          meta,
          usingFallback,
          courses,
          courseCount: courses.length,
          assignmentCount: countAll(courses),
          lastScrapedAt: resolvedData?.scrapedAt ?? meta?.scrapedAt ?? null,
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
