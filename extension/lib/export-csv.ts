/**
 * export-csv.ts — export the scraped gradebook to a CSV file, fully on-device.
 *
 * Reads the already-scraped data (no new Schoology requests) and triggers a
 * plain Blob download. Nothing leaves the machine.
 */

import type { ScrapedCourse } from './schemas';
import { scorePercent } from './grade-utils';

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

export function buildGradesCsv(courses: ScrapedCourse[]): string {
  const rows: string[][] = [[
    'Course', 'Teacher', 'Course Grade', 'Category', 'Category Weight',
    'Assignment', 'Score', 'Max', 'Percent', 'Due Date', 'Status', 'Exception',
  ]];
  for (const c of courses) {
    for (const cat of c.categories) {
      for (const a of cat.assignments) {
        const pct = scorePercent(a.score, a.maxGrade);
        rows.push([
          c.name, c.teacher ?? '', c.grade, cat.name, cat.weight ?? '',
          a.name, a.score, a.maxGrade, pct !== null ? pct.toFixed(1) : '',
          a.dueDate ?? '', a.status, a.exception ?? '',
        ]);
      }
    }
  }
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
}

export function downloadGradesCsv(courses: ScrapedCourse[]): void {
  const csv = buildGradesCsv(courses);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `grades-${stamp}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
}
