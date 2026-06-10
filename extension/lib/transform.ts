/**
 * transform.ts — Phase 1
 *
 * Pure transform helpers copied/adapted from the old app.
 * These have no DOM or browser dependencies.
 */

/**
 * Courses to skip — hub pages, counseling, tutorial, etc.
 * Copied from scrape-schoology.ts line 46.
 */
export const SKIP_PATTERN = /hub|counseling|tutorial|advisees?|basics\s+for\s+students/i;

/**
 * Parse a raw Schoology course title into a clean name and teacher.
 *
 * Examples:
 *   "Algebra 2/Trig - 2320: StubbsA p2 T2" → { name: "Algebra 2/Trig", teacher: "StubbsA" }
 *   "Biology - 3110: GeeA p1 T2"            → { name: "Biology", teacher: "GeeA" }
 *   "CHS Hub: Gr09"                          → { name: "CHS Hub", teacher: "" }
 *
 * Adapted from scrape-schoology.ts lines 56-58.
 */
export function parseCourseTitle(rawTitle: string): { name: string; teacher: string } {
  const m = rawTitle.match(/^(.+?)\s*-\s*\d+:\s*([A-Za-z,]+(?:\s+[A-Za-z,]+)*)\s+p/i);
  const name = m ? m[1].trim() : rawTitle.split(/\s*-\s*\d+:|\s*:/)[0].trim();
  const teacher = m ? m[2].trim() : '';
  return { name, teacher };
}

/**
 * Clean an assignment name by stripping Schoology visual labels.
 * Adapted from scrape-schoology.ts lines 106-111.
 */
export function cleanAssignmentName(rawName: string): string {
  return rawName
    .replace(/Note:\s*This material[^]*?Schoology\.?/i, '')
    .replace(/\s*(external-tool-link|external-tool)\s*$/i, '')
    .replace(/\s*(test-quiz|test-|assignment\b|quiz\b|discussion)\s*$/i, '')
    .replace(/^(test-quiz|test-|assignment\b|quiz\b)\s*/i, '')
    .trim();
}

/**
 * Parse grade string into letter + percentage.
 * e.g. "A (97.44%)" → { letter: "A", percent: 97.44 }
 *      "B+"          → { letter: "B+", percent: null }
 *      ""            → { letter: "", percent: null }
 */
export function parseGrade(grade: string): { letter: string; percent: number | null } {
  if (!grade) return { letter: '', percent: null };
  const m = grade.match(/^([A-F][+-]?)\s*(?:\((\d+\.?\d*)%\))?$/i);
  if (!m) return { letter: grade, percent: null };
  return {
    letter: m[1],
    percent: m[2] ? parseFloat(m[2]) : null,
  };
}

/**
 * Count total assignments across all courses.
 */
export function countAssignments(
  courses: Array<{ categories: Array<{ assignments: unknown[] }> }>
): number {
  return courses.reduce(
    (sum, c) => sum + c.categories.reduce((s, cat) => s + cat.assignments.length, 0),
    0,
  );
}
