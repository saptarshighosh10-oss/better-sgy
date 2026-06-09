/**
 * scrape-dom.ts — Phase 1
 *
 * Extracts grade data from the live Schoology DOM.
 *
 * This is a near-verbatim port of the Puppeteer page.evaluate() callback
 * from lib/scraper/scrape-schoology.ts lines 45-140.
 * The only change: receives `doc` as a parameter instead of using the
 * implicit `document` global, so it can also work with DOMParser output.
 */

import { SKIP_PATTERN, parseCourseTitle, cleanAssignmentName, countAssignments } from './transform';
import type { ScrapedCourse, ScrapedCategory, ScrapedAssignment, SchoologyData } from './schemas';

export interface ScrapeOutput {
  courses: ScrapedCourse[];
  gradingPeriod: string;
}

/**
 * Scrape grade data from a Document (live page or DOMParser result).
 *
 * Safety: if zero courses are found, the caller must NOT overwrite stored data.
 */
export function scrapeGradesFromDoc(doc: Document): ScrapeOutput {
  const courses: ScrapedCourse[] = [];
  let gradingPeriod = '';

  doc.querySelectorAll('.gradebook-course').forEach((courseDiv) => {
    const titleLink = courseDiv.querySelector('.gradebook-course-title a') as HTMLAnchorElement | null;
    const rawTitle = titleLink?.textContent?.trim() ?? '';
    if (!rawTitle || SKIP_PATTERN.test(rawTitle)) return;
    // Extract section ID from div id: "s-js-gradebook-course-{sectionId}"
    const sectionId = (courseDiv as HTMLElement).id?.replace('s-js-gradebook-course-', '') ?? '';
    const href = sectionId ? `${location.origin}/course/${sectionId}` : '';

    const { name, teacher } = parseCourseTitle(rawTitle);

    const courseRow = courseDiv.querySelector('.report-row.course-row');
    const letter = courseRow?.querySelector('.alpha-grade')?.textContent?.trim() ?? '';
    const pctRaw = courseRow?.querySelector('.rounded-grade')?.getAttribute('title') ?? '';
    const pct = pctRaw ? parseFloat(pctRaw) : null;
    const grade = letter
      ? `${letter}${pct !== null && !isNaN(pct) ? ` (${pct.toFixed(2)}%)` : ''}`
      : '';

    const categories: ScrapedCategory[] = [];
    let currentCat: ScrapedCategory | null = null;
    // Track whether we're inside a hidden grading-period section (e.g. the
    // "(no grading period)" phantom section Schoology appends at the bottom).
    let inHiddenSection = false;

    courseDiv.querySelectorAll('.report-row').forEach((row) => {
      const cl = row.classList;

      if (cl.contains('period-row')) {
        inHiddenSection = cl.contains('hidden');
        if (!inHiddenSection) {
          const periodText =
            row
              .querySelector('.title')
              ?.textContent?.replace(/\s*Grading\s+Period\s*/gi, '')
              .trim() ?? '';
          if (periodText && !gradingPeriod) gradingPeriod = periodText;
        }
        return;
      }

      if (inHiddenSection) return;

      if (cl.contains('category-row')) {
        const rawName =
          row
            .querySelector('.title')
            ?.textContent?.replace(/\s*Category\s*$/i, '')
            .trim() ?? '';
        const weight =
          row
            .querySelector('.percentage-contrib')
            ?.textContent?.replace(/[()]/g, '')
            .trim() ?? '';
        currentCat = { name: rawName, weight, assignments: [] };
        categories.push(currentCat);
      } else if (cl.contains('item-row') && currentCat) {
        const titleEl = row.querySelector('.title');
        const rawName = (titleEl?.querySelector('a') ?? titleEl)?.textContent ?? '';

        const aName = cleanAssignmentName(rawName);
        if (!aName) return;

        const scoreEl = row.querySelector('.rounded-grade');
        const score =
          scoreEl?.getAttribute('title') ?? scoreEl?.textContent?.trim() ?? '';
        const maxGrade =
          row
            .querySelector('.max-grade')
            ?.textContent?.replace(/^\/\s*/, '')
            .trim() ?? '';

        // Skip items that have no score, no max points, and are marked unavailable
        if (
          !score &&
          !maxGrade &&
          row.textContent?.includes('not available within Schoology')
        )
          return;

        const dueDate =
          row
            .querySelector('.due-date')
            ?.textContent?.replace(/\bDue\b/gi, '')
            .trim() ?? '';

        const isPending = !!row.querySelector(
          '.grade-pending-icon, .has-dropbox-icon'
        );
        const status: ScrapedAssignment['status'] = score
          ? 'graded'
          : isPending
            ? 'submitted'
            : 'unsubmitted';

        currentCat.assignments.push({ name: aName, score, maxGrade, dueDate, status });
      }
    });

    if (name) courses.push({ name, teacher, grade, href, categories });
  });

  return { courses, gradingPeriod };
}

/**
 * Build a full SchoologyData object from scrape output.
 */
export function buildSchoologyData(output: ScrapeOutput): SchoologyData {
  return {
    scrapedAt: Date.now(),
    gradingPeriod: output.gradingPeriod,
    courses: output.courses,
  };
}

// ── Safety guards ────────────────────────────────────────────────────────────

export interface GuardResult {
  safe: boolean;
  reason: string;
}

/**
 * Check whether new scrape data is safe to save, given previous data.
 *
 * Guards:
 * 1. Zero courses → unsafe
 * 2. Course count dropped by > 50% → suspicious
 * 3. Assignment count dropped by > 40% → suspicious
 */
export function checkSafetyGuards(
  newData: SchoologyData,
  previousData: SchoologyData | null
): GuardResult {
  if (newData.courses.length === 0) {
    return { safe: false, reason: 'Zero courses scraped — refusing to overwrite' };
  }

  if (!previousData) {
    return { safe: true, reason: 'No previous data — first scrape' };
  }

  const prevCourses = previousData.courses.length;
  const newCourses = newData.courses.length;
  if (prevCourses > 0 && newCourses < prevCourses * 0.5) {
    return {
      safe: false,
      reason: `Course count dropped suspiciously: ${prevCourses} → ${newCourses}`,
    };
  }

  const prevAssignments = countAssignments(previousData.courses);
  const newAssignments = countAssignments(newData.courses);
  if (prevAssignments > 0 && newAssignments < prevAssignments * 0.6) {
    return {
      safe: false,
      reason: `Assignment count dropped suspiciously: ${prevAssignments} → ${newAssignments}`,
    };
  }

  return { safe: true, reason: 'Guards passed' };
}
