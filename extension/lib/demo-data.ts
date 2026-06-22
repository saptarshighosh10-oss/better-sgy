/**
 * demo-data.ts — realistic fake Schoology data for the Demo edition.
 *
 * Seeded into storage on first sidepanel open when VITE_DEMO=true.
 * In non-demo builds Vite tree-shakes the entire import — zero overhead.
 */
import type { SchoologyData } from './schemas';
import type { ChangeEvent } from './grade-changes';
import type { Announcement } from './fetch-announcements';
import type { WatchStatus } from './watch-status';

const NOW = Date.now();
const DAY = 86_400_000;

function d(m: number, day: number): string { return `${m}/${day}/26`; }

const GRADE_DATA: SchoologyData = {
  scrapedAt: NOW,
  gradingPeriod: 'Q4 2025-2026',
  courses: [
    {
      name: 'AP Computer Science A',
      teacher: 'Mr. Chen',
      grade: 'A (94.3%)',
      href: '/course/123456789',
      categories: [
        {
          name: 'Tests & Quizzes', weight: '60%',
          assignments: [
            { name: 'Unit 1 Test: Intro to Java',      score: '92', maxGrade: '/ 100', dueDate: d(2,5),  status: 'graded' },
            { name: 'Unit 2 Quiz: Arrays',              score: '18', maxGrade: '/ 20',  dueDate: d(2,19), status: 'graded' },
            { name: 'Unit 3 Test: OOP Fundamentals',   score: '88', maxGrade: '/ 100', dueDate: d(3,12), status: 'graded' },
            { name: 'Midterm Exam',                    score: '142',maxGrade: '/ 150', dueDate: d(3,5),  status: 'graded' },
            { name: 'Unit 4 Quiz: Inheritance',        score: '19', maxGrade: '/ 20',  dueDate: d(4,2),  status: 'graded' },
            { name: 'Unit 5 Test: Recursion',          score: '95', maxGrade: '/ 100', dueDate: d(4,23), status: 'graded' },
            { name: 'Unit 6 Quiz: Sorting Algorithms', score: '17', maxGrade: '/ 20',  dueDate: d(5,14), status: 'graded' },
            { name: 'Unit 7 Test: Data Structures',    score: '',   maxGrade: '/ 100', dueDate: d(6,25), status: 'unsubmitted' },
          ],
        },
        {
          name: 'Projects & Labs', weight: '30%',
          assignments: [
            { name: 'Lab 1: Hello World & Variables',   score: '25', maxGrade: '/ 25',  dueDate: d(2,10), status: 'graded' },
            { name: 'Project 1: Simple Calculator',     score: '47', maxGrade: '/ 50',  dueDate: d(3,3),  status: 'graded' },
            { name: 'Lab 2: Array Manipulation',        score: '23', maxGrade: '/ 25',  dueDate: d(3,24), status: 'graded' },
            { name: 'Project 2: Student Grade Tracker', score: '96', maxGrade: '/ 100', dueDate: d(4,16), status: 'graded' },
            { name: 'Lab 3: Binary Search Tree',        score: '22', maxGrade: '/ 25',  dueDate: d(5,7),  status: 'graded' },
            { name: 'Final Project: Build an App',      score: '',   maxGrade: '/ 150', dueDate: d(6,18), status: 'unsubmitted' },
          ],
        },
        {
          name: 'Homework', weight: '10%',
          assignments: [
            { name: 'HW 1-5: Chapter Exercises',   score: '10', maxGrade: '/ 10', dueDate: d(2,7),  status: 'graded' },
            { name: 'HW 6-10: OOP Practice',       score: '9',  maxGrade: '/ 10', dueDate: d(3,14), status: 'graded' },
            { name: 'HW 11-15: Recursion Problems', score: '10', maxGrade: '/ 10', dueDate: d(4,25), status: 'graded' },
          ],
        },
      ],
    },
    {
      name: 'AP US History',
      teacher: 'Ms. Rodriguez',
      grade: 'B+ (88.7%)',
      href: '/course/987654321',
      categories: [
        {
          name: 'Exams', weight: '55%',
          assignments: [
            { name: 'Period 4 Test: Industrial Revolution', score: '84',  maxGrade: '/ 100', dueDate: d(2,11), status: 'graded' },
            { name: 'Period 5 Test: Civil War Era',         score: '91',  maxGrade: '/ 100', dueDate: d(3,4),  status: 'graded' },
            { name: 'Midterm: Periods 1-5',                 score: '174', maxGrade: '/ 200', dueDate: d(3,18), status: 'graded' },
            { name: 'Period 6 Test: Gilded Age',            score: '89',  maxGrade: '/ 100', dueDate: d(4,8),  status: 'graded' },
            { name: 'Period 7 Test: Progressive Era',       score: '86',  maxGrade: '/ 100', dueDate: d(5,6),  status: 'graded' },
            { name: 'AP Exam Practice Test',                score: '',    maxGrade: '/ 100', dueDate: d(5,27), status: 'unsubmitted' },
          ],
        },
        {
          name: 'Essays & DBQs', weight: '30%',
          assignments: [
            { name: 'LEQ: Causes of the Civil War', score: '6', maxGrade: '/ 9', dueDate: d(2,25), status: 'graded' },
            { name: 'DBQ: Immigration 1865-1920',   score: '7', maxGrade: '/ 9', dueDate: d(3,25), status: 'graded' },
            { name: 'SAQ: Reconstruction',          score: '5', maxGrade: '/ 6', dueDate: d(4,15), status: 'graded' },
            { name: 'LEQ: Progressive Reform',      score: '',  maxGrade: '/ 9', dueDate: d(5,20), status: 'submitted' },
          ],
        },
        {
          name: 'Classwork & HW', weight: '15%',
          assignments: [
            { name: 'Primary Source Analysis #1', score: '19', maxGrade: '/ 20', dueDate: d(2,17), status: 'graded' },
            { name: 'Primary Source Analysis #2', score: '17', maxGrade: '/ 20', dueDate: d(3,31), status: 'graded' },
            { name: 'Chapter Notes 12-14',         score: '10', maxGrade: '/ 10', dueDate: d(4,28), status: 'graded' },
          ],
        },
      ],
    },
    {
      name: 'English Literature AP',
      teacher: 'Mrs. Patel',
      grade: 'A- (91.2%)',
      href: '/course/456789123',
      categories: [
        {
          name: 'Major Assessments', weight: '50%',
          assignments: [
            { name: 'Essay 1: Theme in Great Gatsby',   score: '87',  maxGrade: '/ 100', dueDate: d(2,8),  status: 'graded' },
            { name: 'Timed Write: Poetry Analysis',     score: '8',   maxGrade: '/ 9',   dueDate: d(3,1),  status: 'graded' },
            { name: 'Midterm: Multiple Choice + Essay', score: '180', maxGrade: '/ 200', dueDate: d(3,15), status: 'graded' },
            { name: 'Essay 2: 1984 Satire Analysis',    score: '93',  maxGrade: '/ 100', dueDate: d(4,5),  status: 'graded' },
            { name: 'AP Practice Exam',                 score: '',    maxGrade: '/ 150', dueDate: d(5,22), status: 'unsubmitted' },
          ],
        },
        {
          name: 'Quizzes & Reading', weight: '30%',
          assignments: [
            { name: 'Quiz: Great Gatsby Ch. 1-5', score: '19', maxGrade: '/ 20', dueDate: d(2,3),  status: 'graded' },
            { name: 'Quiz: Great Gatsby Ch. 6-9', score: '18', maxGrade: '/ 20', dueDate: d(2,20), status: 'graded' },
            { name: 'Quiz: 1984 Part 1',          score: '17', maxGrade: '/ 20', dueDate: d(3,22), status: 'graded' },
            { name: 'Quiz: Beloved Analysis',     score: '20', maxGrade: '/ 20', dueDate: d(4,19), status: 'graded' },
            { name: 'Reading Check: Hamlet',      score: '',   maxGrade: '/ 20', dueDate: d(5,15), status: 'unsubmitted' },
          ],
        },
        {
          name: 'Participation & Journals', weight: '20%',
          assignments: [
            { name: "Journal 1: Personal Connection", score: '10', maxGrade: '/ 10', dueDate: d(2,14), status: 'graded' },
            { name: "Journal 2: Author's Voice",      score: '9',  maxGrade: '/ 10', dueDate: d(3,7),  status: 'graded' },
            { name: 'Journal 3: Symbol Analysis',     score: '10', maxGrade: '/ 10', dueDate: d(4,11), status: 'graded' },
          ],
        },
      ],
    },
    {
      name: 'Pre-Calculus Honors',
      teacher: 'Mr. Kim',
      grade: 'B (85.1%)',
      href: '/course/789123456',
      categories: [
        {
          name: 'Tests', weight: '65%',
          assignments: [
            { name: 'Ch. 5 Test: Trig Functions',        score: '82',  maxGrade: '/ 100', dueDate: d(2,6),  status: 'graded' },
            { name: 'Ch. 6 Test: Trig Identities',       score: '79',  maxGrade: '/ 100', dueDate: d(3,2),  status: 'graded' },
            { name: 'Midterm Exam',                      score: '250', maxGrade: '/ 300', dueDate: d(3,17), status: 'graded' },
            { name: 'Ch. 7 Test: Exponential Functions', score: '88',  maxGrade: '/ 100', dueDate: d(4,7),  status: 'graded' },
            { name: 'Ch. 8 Test: Logarithms',            score: '91',  maxGrade: '/ 100', dueDate: d(5,5),  status: 'graded' },
            { name: 'Ch. 9 Test: Sequences & Series',    score: '',    maxGrade: '/ 100', dueDate: d(6,2),  status: 'unsubmitted' },
          ],
        },
        {
          name: 'Homework', weight: '25%',
          assignments: [
            { name: 'HW: Trig Identities Practice',    score: '9',  maxGrade: '/ 10', dueDate: d(2,12), status: 'graded' },
            { name: 'HW: Unit Circle Mastery',         score: '8',  maxGrade: '/ 10', dueDate: d(2,26), status: 'graded' },
            { name: 'HW: Exponential Growth Problems', score: '10', maxGrade: '/ 10', dueDate: d(4,14), status: 'graded' },
            { name: 'HW: Log Properties',              score: '8',  maxGrade: '/ 10', dueDate: d(5,12), status: 'graded' },
            { name: 'HW: Sequences Worksheet',         score: '',   maxGrade: '/ 10', dueDate: d(6,5),  status: 'unsubmitted' },
          ],
        },
        {
          name: 'Quizzes', weight: '10%',
          assignments: [
            { name: 'Quiz: Trig Basics',  score: '9', maxGrade: '/ 10', dueDate: d(2,2),  status: 'graded' },
            { name: 'Quiz: Inverse Trig', score: '7', maxGrade: '/ 10', dueDate: d(3,26), status: 'graded' },
            { name: 'Quiz: Natural Log',  score: '9', maxGrade: '/ 10', dueDate: d(5,19), status: 'graded' },
          ],
        },
      ],
    },
    {
      name: 'Biology Honors',
      teacher: 'Dr. Johnson',
      grade: 'A (93.8%)',
      href: '/course/321654987',
      categories: [
        {
          name: 'Unit Tests', weight: '50%',
          assignments: [
            { name: 'Unit 4: Genetics Test',      score: '94',  maxGrade: '/ 100', dueDate: d(2,4),  status: 'graded' },
            { name: 'Unit 5: Evolution Test',     score: '91',  maxGrade: '/ 100', dueDate: d(3,11), status: 'graded' },
            { name: 'Midterm: Units 1-5',         score: '278', maxGrade: '/ 300', dueDate: d(3,20), status: 'graded' },
            { name: 'Unit 6: Ecology Test',       score: '96',  maxGrade: '/ 100', dueDate: d(4,22), status: 'graded' },
            { name: 'Unit 7: Human Body Systems', score: '90',  maxGrade: '/ 100', dueDate: d(5,13), status: 'graded' },
            { name: 'Final Exam Prep Test',       score: '',    maxGrade: '/ 100', dueDate: d(6,10), status: 'unsubmitted' },
          ],
        },
        {
          name: 'Labs', weight: '35%',
          assignments: [
            { name: 'Lab: Punnett Square Practice',      score: '48', maxGrade: '/ 50',  dueDate: d(2,16), status: 'graded' },
            { name: 'Lab: Natural Selection Simulation', score: '47', maxGrade: '/ 50',  dueDate: d(3,9),  status: 'graded' },
            { name: 'Lab Report: Population Genetics',   score: '93', maxGrade: '/ 100', dueDate: d(4,1),  status: 'graded' },
            { name: 'Lab: Ecosystem Food Webs',          score: '46', maxGrade: '/ 50',  dueDate: d(4,28), status: 'graded' },
            { name: 'Lab: Dissection & Analysis',        score: '49', maxGrade: '/ 50',  dueDate: d(5,21), status: 'graded' },
            { name: 'Final Lab Practical',               score: '',   maxGrade: '/ 100', dueDate: d(6,15), status: 'unsubmitted' },
          ],
        },
        {
          name: 'Quizzes & HW', weight: '15%',
          assignments: [
            { name: 'Quiz: Mendelian Genetics', score: '19', maxGrade: '/ 20', dueDate: d(2,21), status: 'graded' },
            { name: 'HW: Evolution Reading',   score: '10', maxGrade: '/ 10', dueDate: d(3,28), status: 'graded' },
            { name: 'Quiz: Ecology Vocab',     score: '18', maxGrade: '/ 20', dueDate: d(4,30), status: 'graded' },
          ],
        },
      ],
    },
    {
      name: 'Spanish 3',
      teacher: 'Sra. Martinez',
      grade: 'B+ (87.4%)',
      href: '/course/654987321',
      categories: [
        {
          name: 'Tests & Exams', weight: '55%',
          assignments: [
            { name: 'Test: Subjunctive Mood',       score: '85',  maxGrade: '/ 100', dueDate: d(2,13), status: 'graded' },
            { name: 'Test: Preterite vs Imperfect', score: '88',  maxGrade: '/ 100', dueDate: d(3,6),  status: 'graded' },
            { name: 'Midterm: Oral & Written',      score: '260', maxGrade: '/ 300', dueDate: d(3,19), status: 'graded' },
            { name: 'Test: Por vs Para',            score: '91',  maxGrade: '/ 100', dueDate: d(4,10), status: 'graded' },
            { name: 'Test: Conditional Tense',      score: '87',  maxGrade: '/ 100', dueDate: d(5,8),  status: 'graded' },
            { name: 'Final Oral Presentation',      score: '',    maxGrade: '/ 100', dueDate: d(6,12), status: 'unsubmitted' },
          ],
        },
        {
          name: 'Speaking & Writing', weight: '30%',
          assignments: [
            { name: 'Oral: Weekend Plans Conversation',  score: '43', maxGrade: '/ 50',  dueDate: d(2,22), status: 'graded' },
            { name: 'Essay: Mi Familia',                 score: '87', maxGrade: '/ 100', dueDate: d(3,16), status: 'graded' },
            { name: 'Oral: Cultural Presentation',       score: '46', maxGrade: '/ 50',  dueDate: d(4,24), status: 'graded' },
            { name: 'Essay: El Futuro de la Tecnología', score: '',   maxGrade: '/ 100', dueDate: d(5,29), status: 'submitted' },
          ],
        },
        {
          name: 'Vocabulary & HW', weight: '15%',
          assignments: [
            { name: 'Vocab Quiz: Chapter 5',    score: '18', maxGrade: '/ 20', dueDate: d(2,28), status: 'graded' },
            { name: 'Vocab Quiz: Chapter 6',    score: '17', maxGrade: '/ 20', dueDate: d(4,3),  status: 'graded' },
            { name: 'HW: Conjugation Practice', score: '10', maxGrade: '/ 10', dueDate: d(5,17), status: 'graded' },
          ],
        },
      ],
    },
  ],
};

const CHANGES: ChangeEvent[] = [
  { kind: 'grade',          course: 'AP Computer Science A', oldPct: 92.1, newPct: 94.3, delta: 2.2, ts: NOW - 3 * DAY },
  { kind: 'graded',         course: 'Biology Honors',        name: 'Lab: Dissection & Analysis',    pct: 98, score: '49', max: '/ 50',  ts: NOW - 1 * DAY },
  { kind: 'new-assignment', course: 'AP US History',          name: 'AP Exam Practice Test',                               ts: NOW - 2 * DAY },
  { kind: 'grade',          course: 'Pre-Calculus Honors',   oldPct: 83.7, newPct: 85.1, delta: 1.4, ts: NOW - 4 * DAY },
  { kind: 'graded',         course: 'English Literature AP', name: 'Essay 2: 1984 Satire Analysis', pct: 93, score: '93', max: '/ 100', ts: NOW - 5 * DAY },
  { kind: 'new-assignment', course: 'Spanish 3',             name: 'Final Oral Presentation',                              ts: NOW - 6 * DAY },
];

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'demo-msg-1', kind: 'message',
    author: 'Mr. Chen', courseName: 'AP Computer Science A',
    body: "Great work on the recursion unit! Reminder: the final project proposal is due by Friday. Include a brief description of your app idea and the data structures you plan to use.",
    bodyHtml: '', timeText: '2 days ago', timestamp: NOW - 2 * DAY, link: null,
  },
  {
    id: 'demo-ntf-1', kind: 'update',
    author: 'Biology Honors', courseName: 'Biology Honors',
    body: 'Graded: Lab: Dissection & Analysis — 49/50 (98%)',
    bodyHtml: '', timeText: '1 day ago', timestamp: NOW - 1 * DAY, link: null,
  },
  {
    id: 'demo-msg-2', kind: 'message',
    author: 'Ms. Rodriguez', courseName: 'AP US History',
    body: "AP Exam prep this Thursday, lunch, Room 214. We'll review the DBQ rubric and do a timed practice write. Strongly recommended for anyone aiming for a 4 or 5.",
    bodyHtml: '', timeText: '3 days ago', timestamp: NOW - 3 * DAY, link: null,
  },
  {
    id: 'demo-cu-1', kind: 'class-update',
    author: 'Mrs. Patel', courseName: 'English Literature AP',
    body: "Hamlet reading guide posted under Materials. Complete Act 1-2 annotations before Monday's Socratic Seminar.",
    bodyHtml: '', timeText: '4 days ago', timestamp: NOW - 4 * DAY, link: null,
  },
  {
    id: 'demo-cu-2', kind: 'class-update',
    author: 'Mr. Kim', courseName: 'Pre-Calculus Honors',
    body: 'Ch. 9 Test moved to June 2nd. Study guide on the class page. Focus on geometric series, arithmetic sequences, and the binomial theorem.',
    bodyHtml: '', timeText: '5 days ago', timestamp: NOW - 5 * DAY, link: null,
  },
  {
    id: 'demo-cu-3', kind: 'class-update',
    author: 'Sra. Martinez', courseName: 'Spanish 3',
    body: "Final oral presentation topics posted! Office hours M/W 3-4pm if you need help. You'll present for 4-5 minutes with a visual aid.",
    bodyHtml: '', timeText: '6 days ago', timestamp: NOW - 6 * DAY, link: null,
  },
];

const WATCH: WatchStatus = { ok: true, ts: NOW - 15 * 60_000 };

/** Write fake school data into storage. Skips if already done (idempotent). */
export async function seedDemoData(): Promise<void> {
  const r = await browser.storage.local.get('bs_demo_seeded');
  if (r.bs_demo_seeded) return;
  await browser.storage.local.set({
    bs_grade_data:          GRADE_DATA,
    bs_grade_changes:       CHANGES,
    bs_announcements_cache: ANNOUNCEMENTS,
    bs_watch_status:        WATCH,
    bs_theme_state:         { theme: 'original', accent: 'default' },
    bs_demo_seeded:         true,
  });
}
