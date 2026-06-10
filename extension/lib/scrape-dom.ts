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
        const titleLink = titleEl?.querySelector('a');
        const rawName = (titleLink ?? titleEl)?.textContent ?? '';
        const link = titleLink?.getAttribute('href') ?? ''; // assignment URL (may be relative)

        const aName = cleanAssignmentName(rawName);
        if (!aName) return;

        const scoreEl = row.querySelector('.rounded-grade');
        let score =
          (scoreEl?.getAttribute('title') ?? scoreEl?.textContent?.trim() ?? '').trim();

        // Schoology grade "exceptions" (teacher-set) render where the score would be, or
        // in a dedicated exception element. Pull them out and track separately so an
        // Excused/Incomplete item is never mistaken for "missing".
        let exception = '';
        const exSource = (
          score ||
          row.querySelector('.exception, .grade-exception, .exception-icon')?.getAttribute('title') ||
          row.querySelector('.exception, .grade-exception')?.textContent ||
          ''
        ).trim();
        const exHit = exSource.match(/\b(missing|excused|incomplete|absent)\b/i);
        if (exHit) {
          const w = exHit[1].toLowerCase();
          exception = w === 'missing' ? 'Missing' : w === 'excused' ? 'Excused' : w === 'incomplete' ? 'Incomplete' : 'Absent';
          // If the exception word was sitting in the score cell, it isn't a real grade.
          if (/^(missing|excused|incomplete|absent|exc|inc|abs)$/i.test(score)) score = '';
        }

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

        // "Did the student submit?" — Schoology marks a dropbox/submission/pending grade
        // several different ways across versions and themes. Missing any of them is what
        // flagged submitted work as "missing", so cast a wide net here.
        const isPending = !!row.querySelector(
          '.grade-pending-icon, .has-dropbox-icon, .dropbox-icon, .submission-icon, ' +
          '.icon-dropbox, .icon-submission, .has-submission, .submitted, .submission-status, ' +
          'a[href*="/submissions/"], a[href*="/dropbox"], ' +
          '[class*="dropbox" i], [class*="submission" i], ' +
          '[title*="pending" i], [title*="submitted" i], [title*="submission" i], [title*="turned in" i]'
        );
        const status: ScrapedAssignment['status'] = score
          ? 'graded'
          : isPending
            ? 'submitted'
            : 'unsubmitted';

        currentCat.assignments.push({ name: aName, score, maxGrade, dueDate, status, exception, link });
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
