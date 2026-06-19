/**
 * schemas.ts — Phase 1
 *
 * Zod schemas for raw scraped grade data.
 * These validate the output of scrapeGradesFromDoc() before storage.
 */

import { z } from 'zod';

// ── Raw scraped shapes (match the old Puppeteer scraper output) ───────────────

export const ScrapedAssignmentSchema = z.object({
  name: z.string().min(1),
  score: z.string(),          // may be '' for ungraded
  maxGrade: z.string(),       // e.g. '/ 20' or ''
  dueDate: z.string(),        // e.g. '1/20/26' or ''
  status: z.enum(['graded', 'submitted', 'unsubmitted']),
  // Schoology grade "exception" set by the teacher, if any:
  // 'Missing' | 'Excused' | 'Incomplete' | 'Absent'. Optional for back-compat.
  exception: z.string().optional(),
  // URL to the assignment on Schoology (may be relative). Optional for back-compat.
  link: z.string().optional(),
});

export const ScrapedCategorySchema = z.object({
  name: z.string().min(1),
  weight: z.string(),         // e.g. '80%' or ''
  assignments: z.array(ScrapedAssignmentSchema),
});

export const ScrapedCourseSchema = z.object({
  name: z.string().min(1),
  teacher: z.string(),
  grade: z.string(),          // e.g. 'A (97.44%)' or ''
  href: z.string(),
  categories: z.array(ScrapedCategorySchema),
});

export const SchoologyDataSchema = z.object({
  scrapedAt: z.number(),
  gradingPeriod: z.string(),
  courses: z.array(ScrapedCourseSchema).min(1, 'Must have at least 1 course'),
});

// ── Inferred types ───────────────────────────────────────────────────────────

export type ScrapedAssignment = z.infer<typeof ScrapedAssignmentSchema>;
export type ScrapedCategory = z.infer<typeof ScrapedCategorySchema>;
export type ScrapedCourse = z.infer<typeof ScrapedCourseSchema>;
export type SchoologyData = z.infer<typeof SchoologyDataSchema>;

// ── Validation helper ────────────────────────────────────────────────────────

export interface ValidationResult {
  success: boolean;
  data: SchoologyData | null;
  errors: string[];
}

export function validateSchoologyData(raw: unknown): ValidationResult {
  const result = SchoologyDataSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data, errors: [] };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );
  return { success: false, data: null, errors };
}
