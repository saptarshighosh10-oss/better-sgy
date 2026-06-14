/**
 * study/demo-data.ts — DEV/TEST ONLY mock gradebook.
 *
 * Summer wipes the real gradebook, so there's nothing for the dashboard to render. This
 * seeds a realistic SchoologyData fixture into storage so every page (Overview, Grades,
 * Assignments, Calendar, Study) works for testing. useExtensionGrades listens to storage
 * changes, so seeding updates the UI live — no reload needed.
 *
 * NOT shipped behavior: remove the seed buttons / window globals before store submission.
 */
import type { SchoologyData } from './schemas';
import { saveGradeData, saveScrapeMeta } from './storage';

const g = (name: string, score: string, max: string, due: string,
  status: 'graded' | 'submitted' | 'unsubmitted' = 'graded', exception?: string) =>
  ({ name, score, maxGrade: max, dueDate: due, status, ...(exception ? { exception } : {}) });

export const DEMO_DATA: SchoologyData = {
  scrapedAt: Date.now(),
  gradingPeriod: 'Semester 2',
  courses: [
    {
      name: 'AP Calculus BC',
      teacher: 'Dr. Nguyen',
      grade: 'A (96.2%)',
      href: '/course/8141837125/grades',
      categories: [
        { name: 'Tests', weight: '60%', assignments: [
          g('Unit 7 Test — Series', '92', '/ 100', '4/12/26'),
          g('Unit 8 Test — Parametric & Polar', '96', '/ 100', '5/03/26'),
        ]},
        { name: 'Quizzes', weight: '25%', assignments: [
          g('Quiz 7.4 — Ratio Test', '19', '/ 20', '4/05/26'),
          g('Quiz 8.1 — Vectors', '18', '/ 20', '4/26/26'),
          g('Quiz 8.3 — Polar Area', '', '/ 20', '5/10/26', 'unsubmitted', 'Missing'),
        ]},
        { name: 'Homework', weight: '15%', assignments: [
          g('HW 7.6 — Taylor Series', '10', '/ 10', '4/08/26'),
          g('HW 8.2 — Arc Length', '9', '/ 10', '4/29/26'),
        ]},
      ],
    },
    {
      name: 'AP English Literature',
      teacher: 'Ms. Whitfield',
      grade: 'A- (91.8%)',
      href: '/course/8141837126/grades',
      categories: [
        { name: 'Essays', weight: '50%', assignments: [
          g('In-Class Essay — Hamlet', '44', '/ 50', '4/09/26'),
          g('Literary Analysis — Beloved', '47', '/ 50', '5/01/26'),
        ]},
        { name: 'Reading Checks', weight: '20%', assignments: [
          g('Reading Check — Acts 1–2', '10', '/ 10', '4/02/26'),
          g('Reading Check — Acts 3–4', '8', '/ 10', '4/16/26'),
        ]},
        { name: 'Participation', weight: '30%', assignments: [
          g('Socratic Seminar — Tragedy', '20', '/ 20', '4/23/26'),
          g('Discussion Post — Motifs', '', '/ 15', '5/08/26', 'submitted'),
        ]},
      ],
    },
    {
      name: 'AP Physics C: Mechanics',
      teacher: 'Mr. Patel',
      grade: 'B+ (88.5%)',
      href: '/course/8141837127/grades',
      categories: [
        { name: 'Exams', weight: '50%', assignments: [
          g('Exam 3 — Rotation', '83', '/ 100', '4/11/26'),
          g('Exam 4 — Oscillations', '90', '/ 100', '5/02/26'),
        ]},
        { name: 'Labs', weight: '30%', assignments: [
          g('Lab — Torque & Equilibrium', '27', '/ 30', '4/04/26'),
          g('Lab — Simple Pendulum', '29', '/ 30', '4/25/26'),
        ]},
        { name: 'Problem Sets', weight: '20%', assignments: [
          g('PS 9 — Angular Momentum', '14', '/ 20', '4/18/26'),
          g('PS 10 — SHM', '', '/ 20', '5/09/26', 'unsubmitted', 'Missing'),
        ]},
      ],
    },
    {
      name: 'U.S. History',
      teacher: 'Mr. Alvarez',
      grade: 'A (94.0%)',
      href: '/course/8141837128/grades',
      categories: [
        { name: 'Tests', weight: '40%', assignments: [
          g('Unit Test — Cold War', '91', '/ 100', '4/10/26'),
          g('Unit Test — Civil Rights', '95', '/ 100', '5/04/26'),
        ]},
        { name: 'DBQs', weight: '30%', assignments: [
          g('DBQ — New Deal', '8', '/ 10', '4/14/26'),
          g('DBQ — Vietnam', '9', '/ 10', '4/30/26'),
        ]},
        { name: 'Homework', weight: '30%', assignments: [
          g('Reading Notes — Ch. 28', '10', '/ 10', '4/07/26'),
          g('Reading Notes — Ch. 29', '10', '/ 10', '4/21/26'),
        ]},
      ],
    },
    {
      name: 'French 4 Honors',
      teacher: 'Mme. Laurent',
      grade: 'A- (92.3%)',
      href: '/course/8141836912/grades',
      categories: [
        { name: 'Quizzes', weight: '40%', assignments: [
          g('Quiz — Subjonctif', '18', '/ 20', '4/06/26'),
          g('Quiz — Conditionnel', '19', '/ 20', '4/27/26'),
        ]},
        { name: 'Oral', weight: '30%', assignments: [
          g('Présentation Orale — Le Cinéma', '28', '/ 30', '4/15/26'),
        ]},
        { name: 'Homework', weight: '30%', assignments: [
          g('Devoirs — Chapitre 6', '10', '/ 10', '4/03/26'),
          g('Devoirs — Chapitre 7', '9', '/ 10', '4/24/26'),
        ]},
      ],
    },
  ],
};

function assignmentCount(d: SchoologyData): number {
  return d.courses.reduce((s, c) => s + c.categories.reduce((a, cat) => a + cat.assignments.length, 0), 0);
}

/** Write the mock gradebook to storage. The grades hook re-renders live on storage change. */
export async function seedDemoData(): Promise<void> {
  const data: SchoologyData = { ...DEMO_DATA, scrapedAt: Date.now() };
  await saveGradeData(data);
  await saveScrapeMeta({
    status: 'fresh',
    scrapedAt: data.scrapedAt,
    courseCount: data.courses.length,
    assignmentCount: assignmentCount(data),
    error: null,
  });
  console.log('[BS] Demo data seeded —', data.courses.length, 'courses');
}

/** Remove the seeded data (back to whatever real/empty state you had). */
export async function clearDemoData(): Promise<void> {
  await browser.storage.local.remove(['bs_grade_data', 'bs_last_good_data', 'bs_scrape_meta']);
  console.log('[BS] Demo data cleared');
}
