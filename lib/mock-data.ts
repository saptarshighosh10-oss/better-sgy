import type {
  Assignment,
  AnalyticsSummary,
  Category,
  Course,
  MockEmail,
  RecentUpdate,
  SchoolYear,
  Semester,
} from './types'

// ─── Course color palette ──────────────────────────────────────────────────────
export const COURSE_COLORS: Record<string, string> = {
  alg: 'var(--color-alg)', // indigo   – Algebra 2 Honors
  bio: 'var(--color-bio)', // emerald  – Biology Honors
  eng: 'var(--color-eng)', // amber    – English 1 / Literature
  fre: 'var(--color-fre)', // violet   – French 1
  pe:  'var(--color-pe)',  // cyan     – Physical Education
  dra: 'var(--color-dra)', // orange   – Drama
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function a(
  id: string,
  courseId: string,
  categoryId: string,
  categoryName: string,
  name: string,
  score: number | null,
  pointsPossible: number,
  status: Assignment['status'],
  gradedDate: string,
  dueDate: string,
): Assignment {
  return {
    id,
    name,
    courseId,
    categoryId,
    categoryName,
    score,
    pointsPossible,
    percent: score !== null ? Math.round((score / pointsPossible) * 1000) / 10 : null,
    status,
    gradedDate,
    dueDate,
  }
}

// ─── Algebra 2 Honors — Mr. Tanaka, P1, 91.3% (A-) ───────────────────────────
const algAssignments: Assignment[] = [
  a('alg-t1',  'alg', 'alg-tests',    'Tests',     'Chapter 5 Test',            87, 100, 'normal',    '2026-02-14', '2026-02-14'),
  a('alg-t2',  'alg', 'alg-tests',    'Tests',     'Chapter 6 Test',            94, 100, 'normal',    '2026-03-10', '2026-03-10'),
  a('alg-t3',  'alg', 'alg-tests',    'Tests',     'Midterm Exam',              91, 100, 'normal',    '2026-01-20', '2026-01-20'),
  a('alg-q1',  'alg', 'alg-quizzes',  'Quizzes',   'Polynomials Quiz',          18,  20, 'normal',    '2026-02-05', '2026-02-05'),
  a('alg-q2',  'alg', 'alg-quizzes',  'Quizzes',   'Rational Functions Quiz',   17,  20, 'normal',    '2026-02-26', '2026-02-26'),
  a('alg-q3',  'alg', 'alg-quizzes',  'Quizzes',   'Exponentials Quiz',         19,  20, 'normal',    '2026-03-15', '2026-03-15'),
  a('alg-h1',  'alg', 'alg-hw',       'Homework',  'HW 5.1 – Polynomials',      10,  10, 'submitted', '2026-01-25', '2026-01-24'),
  a('alg-h2',  'alg', 'alg-hw',       'Homework',  'HW 5.2 – Factoring',         9,  10, 'normal',    '2026-01-28', '2026-01-27'),
  a('alg-h3',  'alg', 'alg-hw',       'Homework',  'HW 5.3 – Rational Expr.',   10,  10, 'normal',    '2026-02-01', '2026-01-31'),
  a('alg-h4',  'alg', 'alg-hw',       'Homework',  'HW 6.1 – Exponentials',     10,  10, 'normal',    '2026-02-17', '2026-02-16'),
  a('alg-h5',  'alg', 'alg-hw',       'Homework',  'HW 6.2 – Logarithms',       10,  10, 'normal',    '2026-02-24', '2026-02-23'),
  a('alg-c1',  'alg', 'alg-cw',       'Classwork', 'Graphing Group Activity',   20,  20, 'normal',    '2026-01-30', '2026-01-30'),
  a('alg-c2',  'alg', 'alg-cw',       'Classwork', 'Transformations Practice',  18,  20, 'normal',    '2026-03-05', '2026-03-05'),
  a('alg-h6',  'alg', 'alg-hw',       'Homework',  'HW 7.1 – Logarithms Review', null, 10, 'normal',  '2026-03-23', '2026-03-23'),
]
const algCategories: Category[] = [
  { id: 'alg-tests',   courseId: 'alg', name: 'Tests',     weight: 40, assignments: algAssignments.filter(x => x.categoryId === 'alg-tests') },
  { id: 'alg-quizzes', courseId: 'alg', name: 'Quizzes',   weight: 25, assignments: algAssignments.filter(x => x.categoryId === 'alg-quizzes') },
  { id: 'alg-hw',      courseId: 'alg', name: 'Homework',  weight: 25, assignments: algAssignments.filter(x => x.categoryId === 'alg-hw') },
  { id: 'alg-cw',      courseId: 'alg', name: 'Classwork', weight: 10, assignments: algAssignments.filter(x => x.categoryId === 'alg-cw') },
]

// ─── Biology Honors — Ms. Okafor, P2, 88.7% (B+), 2 missing ─────────────────
const bioAssignments: Assignment[] = [
  a('bio-t1',  'bio', 'bio-tests',  'Tests',    'Cell Biology Test',        86, 100, 'normal',  '2026-02-12', '2026-02-12'),
  a('bio-t2',  'bio', 'bio-tests',  'Tests',    'Genetics Test',            91, 100, 'normal',  '2026-03-08', '2026-03-08'),
  a('bio-q1',  'bio', 'bio-quiz',   'Quizzes',  'Mitosis Quiz',             17,  20, 'normal',  '2026-02-03', '2026-02-03'),
  a('bio-q2',  'bio', 'bio-quiz',   'Quizzes',  'DNA Structure Quiz',       18,  20, 'normal',  '2026-02-25', '2026-02-25'),
  a('bio-l1',  'bio', 'bio-labs',   'Labs',     'Microscope Lab Report',    45,  50, 'normal',  '2026-01-28', '2026-01-28'),
  a('bio-l2',  'bio', 'bio-labs',   'Labs',     'DNA Extraction Lab',       47,  50, 'normal',  '2026-03-02', '2026-03-02'),
  a('bio-l3',  'bio', 'bio-labs',   'Labs',     'Enzyme Lab Report',       null,  50, 'missing', '2026-03-20', '2026-03-18'),
  a('bio-h1',  'bio', 'bio-hw',     'Homework', 'Reading Ch. 5.1–5.3',     10,  10, 'normal',  '2026-02-08', '2026-02-07'),
  a('bio-h2',  'bio', 'bio-hw',     'Homework', 'Reading Ch. 6.1–6.2',     10,  10, 'normal',  '2026-02-22', '2026-02-21'),
  a('bio-h3',  'bio', 'bio-hw',     'Homework', 'Evolution Worksheet',     null,  20, 'missing', '2026-03-22', '2026-03-20'),
  a('bio-t3',  'bio', 'bio-tests',  'Tests',    'Ecology Unit Test',       null, 100, 'normal',  '2026-03-24', '2026-03-24'),
]
const bioCategories: Category[] = [
  { id: 'bio-tests', courseId: 'bio', name: 'Tests',    weight: 45, assignments: bioAssignments.filter(x => x.categoryId === 'bio-tests') },
  { id: 'bio-quiz',  courseId: 'bio', name: 'Quizzes',  weight: 20, assignments: bioAssignments.filter(x => x.categoryId === 'bio-quiz') },
  { id: 'bio-labs',  courseId: 'bio', name: 'Labs',     weight: 25, assignments: bioAssignments.filter(x => x.categoryId === 'bio-labs') },
  { id: 'bio-hw',    courseId: 'bio', name: 'Homework', weight: 10, assignments: bioAssignments.filter(x => x.categoryId === 'bio-hw') },
]

// ─── English 1 / Literature — Mr. Russo, P3, 94.1% (A) ───────────────────────
const engAssignments: Assignment[] = [
  a('eng-e1',  'eng', 'eng-essays',  'Essays',               'Personal Narrative Essay',    95, 100, 'normal',    '2026-02-08', '2026-02-07'),
  a('eng-e2',  'eng', 'eng-essays',  'Essays',               'Literary Analysis Essay',      93, 100, 'normal',    '2026-03-12', '2026-03-11'),
  a('eng-q1',  'eng', 'eng-quiz',    'Reading Quizzes',      'Romeo & Juliet Quiz',          19,  20, 'normal',    '2026-02-02', '2026-02-02'),
  a('eng-q2',  'eng', 'eng-quiz',    'Reading Quizzes',      'Of Mice and Men Quiz',         18,  20, 'normal',    '2026-02-22', '2026-02-22'),
  a('eng-q3',  'eng', 'eng-quiz',    'Reading Quizzes',      'Poetry Analysis Quiz',         20,  20, 'normal',    '2026-03-08', '2026-03-08'),
  a('eng-c1',  'eng', 'eng-class',   'Classwork',            'Socratic Seminar',             28,  30, 'normal',    '2026-01-29', '2026-01-29'),
  a('eng-c2',  'eng', 'eng-class',   'Classwork',            'Group Project – Themes',       29,  30, 'normal',    '2026-03-15', '2026-03-14'),
  a('eng-c3',  'eng', 'eng-class',   'Classwork',            'Daily Reading Check 1',         5,   5, 'normal',    '2026-02-10', '2026-02-10'),
  a('eng-c4',  'eng', 'eng-class',   'Classwork',            'Daily Reading Check 2',         5,   5, 'normal',    '2026-02-25', '2026-02-25'),
  a('eng-c5',  'eng', 'eng-class',   'Classwork',            'Daily Reading Check 3',         5,   5, 'normal',    '2026-03-10', '2026-03-10'),
  a('eng-e3',  'eng', 'eng-essays',  'Essays',               'Poetry Essay Draft',          null,  50, 'normal',    '2026-03-25', '2026-03-25'),
]
const engCategories: Category[] = [
  { id: 'eng-essays', courseId: 'eng', name: 'Essays',          weight: 50, assignments: engAssignments.filter(x => x.categoryId === 'eng-essays') },
  { id: 'eng-quiz',   courseId: 'eng', name: 'Reading Quizzes', weight: 20, assignments: engAssignments.filter(x => x.categoryId === 'eng-quiz') },
  { id: 'eng-class',  courseId: 'eng', name: 'Classwork',       weight: 30, assignments: engAssignments.filter(x => x.categoryId === 'eng-class') },
]

// ─── French 1 — Mme. Laurent, P4, 96.5% (A) ──────────────────────────────────
const freAssignments: Assignment[] = [
  a('fre-t1',  'fre', 'fre-tests',  'Tests',          'Chapter 5 Test – Verbs',      97, 100, 'normal', '2026-02-10', '2026-02-10'),
  a('fre-t2',  'fre', 'fre-tests',  'Tests',          'Chapter 6 Test – Adjectives', 96, 100, 'normal', '2026-03-11', '2026-03-11'),
  a('fre-o1',  'fre', 'fre-oral',   'Oral',           'Dialogue Presentation',        24,  25, 'normal', '2026-02-19', '2026-02-19'),
  a('fre-o2',  'fre', 'fre-oral',   'Oral',           'Story Retelling',              25,  25, 'normal', '2026-03-17', '2026-03-17'),
  a('fre-h1',  'fre', 'fre-hw',     'Homework',       'HW 5.1 – Conjugation',         10,  10, 'normal', '2026-01-27', '2026-01-26'),
  a('fre-h2',  'fre', 'fre-hw',     'Homework',       'HW 5.2 – Vocab',               10,  10, 'normal', '2026-02-03', '2026-02-02'),
  a('fre-h3',  'fre', 'fre-hw',     'Homework',       'HW 5.3 – Phrases',              9,  10, 'normal', '2026-02-09', '2026-02-08'),
  a('fre-h4',  'fre', 'fre-hw',     'Homework',       'HW 6.1 – Adjective Agreement',  10,  10, 'normal', '2026-02-23', '2026-02-22'),
  a('fre-p1',  'fre', 'fre-part',   'Participation',  'Participation Jan',             15,  15, 'normal', '2026-01-31', '2026-01-31'),
  a('fre-p2',  'fre', 'fre-part',   'Participation',  'Participation Feb',             14,  15, 'normal', '2026-02-28', '2026-02-28'),
  a('fre-p3',  'fre', 'fre-part',   'Participation',  'Participation Mar',             15,  15, 'normal', '2026-03-18', '2026-03-18'),
  a('fre-t3',  'fre', 'fre-tests',  'Tests',          'Chapter 7 Test – Tenses',     null, 100, 'normal', '2026-03-26', '2026-03-26'),
]
const freCategories: Category[] = [
  { id: 'fre-tests', courseId: 'fre', name: 'Tests',         weight: 40, assignments: freAssignments.filter(x => x.categoryId === 'fre-tests') },
  { id: 'fre-oral',  courseId: 'fre', name: 'Oral',          weight: 25, assignments: freAssignments.filter(x => x.categoryId === 'fre-oral') },
  { id: 'fre-hw',    courseId: 'fre', name: 'Homework',      weight: 20, assignments: freAssignments.filter(x => x.categoryId === 'fre-hw') },
  { id: 'fre-part',  courseId: 'fre', name: 'Participation', weight: 15, assignments: freAssignments.filter(x => x.categoryId === 'fre-part') },
]

// ─── Physical Education — Coach Diaz, P5, 99.0% (A) ──────────────────────────
const peAssignments: Assignment[] = [
  a('pe-p1',  'pe', 'pe-part',   'Participation', 'Participation Jan Week 1',  10,  10, 'normal', '2026-01-23', '2026-01-23'),
  a('pe-p2',  'pe', 'pe-part',   'Participation', 'Participation Jan Week 2',  10,  10, 'normal', '2026-01-30', '2026-01-30'),
  a('pe-p3',  'pe', 'pe-part',   'Participation', 'Participation Feb Week 1',  10,  10, 'normal', '2026-02-06', '2026-02-06'),
  a('pe-p4',  'pe', 'pe-part',   'Participation', 'Participation Feb Week 2',  10,  10, 'normal', '2026-02-13', '2026-02-13'),
  a('pe-p5',  'pe', 'pe-part',   'Participation', 'Participation Feb Week 3',   9,  10, 'normal', '2026-02-20', '2026-02-20'),
  a('pe-p6',  'pe', 'pe-part',   'Participation', 'Participation Mar Week 1',  10,  10, 'normal', '2026-03-06', '2026-03-06'),
  a('pe-s1',  'pe', 'pe-skills', 'Skills Tests',  'Fitness Assessment',         98, 100, 'normal', '2026-02-05', '2026-02-05'),
  a('pe-s2',  'pe', 'pe-skills', 'Skills Tests',  'Volleyball Skills Test',     99, 100, 'normal', '2026-03-04', '2026-03-04'),
  a('pe-w1',  'pe', 'pe-written','Written',        'Fitness Journal',            49,  50, 'normal', '2026-02-27', '2026-02-27'),
  a('pe-w2',  'pe', 'pe-written','Written',        'Health & Wellness Quiz',     99, 100, 'normal', '2026-03-13', '2026-03-13'),
]
const peCategories: Category[] = [
  { id: 'pe-part',    courseId: 'pe', name: 'Participation', weight: 60, assignments: peAssignments.filter(x => x.categoryId === 'pe-part') },
  { id: 'pe-skills',  courseId: 'pe', name: 'Skills Tests',  weight: 25, assignments: peAssignments.filter(x => x.categoryId === 'pe-skills') },
  { id: 'pe-written', courseId: 'pe', name: 'Written',       weight: 15, assignments: peAssignments.filter(x => x.categoryId === 'pe-written') },
]

// ─── Drama — Ms. Bell, P6, 85.2% (B), 1 late ─────────────────────────────────
const draAssignments: Assignment[] = [
  a('dra-p1',  'dra', 'dra-perf',  'Performances',   'Improvisation Scene',       82, 100, 'normal',    '2026-02-14', '2026-02-14'),
  a('dra-p2',  'dra', 'dra-perf',  'Performances',   'Monologue Performance',     87, 100, 'normal',    '2026-03-13', '2026-03-13'),
  a('dra-s1',  'dra', 'dra-scene', 'Scene Analysis', 'Scene Analysis Paper',       8,  10, 'late',      '2026-02-20', '2026-02-17'),
  a('dra-s2',  'dra', 'dra-scene', 'Scene Analysis', 'Character Analysis Essay',  85, 100, 'normal',    '2026-03-05', '2026-03-05'),
  a('dra-pa1', 'dra', 'dra-part',  'Participation',  'Participation Jan',          93, 100, 'normal',    '2026-01-31', '2026-01-31'),
  a('dra-pa2', 'dra', 'dra-part',  'Participation',  'Participation Feb',          90, 100, 'normal',    '2026-02-28', '2026-02-28'),
  a('dra-pa3', 'dra', 'dra-part',  'Participation',  'Participation Mar',          88, 100, 'normal',    '2026-03-18', '2026-03-18'),
  a('dra-i1',  'dra', 'dra-scene', 'Scene Analysis', 'Script Read-Through Notes',  76, 100, 'incomplete', '2026-01-25', '2026-01-24'),
  a('dra-p3',  'dra', 'dra-perf',  'Performances',   'Group Scene Performance',   null, 100, 'normal',    '2026-03-27', '2026-03-27'),
]
const draCategories: Category[] = [
  { id: 'dra-perf',  courseId: 'dra', name: 'Performances',   weight: 50, assignments: draAssignments.filter(x => x.categoryId === 'dra-perf') },
  { id: 'dra-scene', courseId: 'dra', name: 'Scene Analysis', weight: 25, assignments: draAssignments.filter(x => x.categoryId === 'dra-scene') },
  { id: 'dra-part',  courseId: 'dra', name: 'Participation',  weight: 25, assignments: draAssignments.filter(x => x.categoryId === 'dra-part') },
]

// ─── Courses ──────────────────────────────────────────────────────────────────
export const mockCourses: Course[] = [
  {
    id: 'alg',
    name: 'Algebra 2 Honors',
    teacher: 'Mr. Tanaka',
    period: 1,
    grade: 91.3,
    letterGrade: 'A-',
    color: COURSE_COLORS.alg,
    categories: algCategories,
    trendData: [90.1, 90.5, 90.8, 91.0, 91.2, 91.4, 91.2, 91.3],
  },
  {
    id: 'bio',
    name: 'Biology Honors',
    teacher: 'Ms. Okafor',
    period: 2,
    grade: 88.7,
    letterGrade: 'B+',
    color: COURSE_COLORS.bio,
    categories: bioCategories,
    trendData: [91.2, 90.5, 89.8, 89.2, 88.9, 88.5, 88.7, 88.7],
  },
  {
    id: 'eng',
    name: 'English 1 / Literature',
    teacher: 'Mr. Russo',
    period: 3,
    grade: 94.1,
    letterGrade: 'A',
    color: COURSE_COLORS.eng,
    categories: engCategories,
    trendData: [93.0, 93.5, 93.8, 94.0, 94.1, 94.2, 94.0, 94.1],
  },
  {
    id: 'fre',
    name: 'French 1',
    teacher: 'Mme. Laurent',
    period: 4,
    grade: 96.5,
    letterGrade: 'A',
    color: COURSE_COLORS.fre,
    categories: freCategories,
    trendData: [96.0, 96.2, 96.4, 96.5, 96.6, 96.5, 96.5, 96.5],
  },
  {
    id: 'pe',
    name: 'Physical Education',
    teacher: 'Coach Diaz',
    period: 5,
    grade: 99.0,
    letterGrade: 'A',
    color: COURSE_COLORS.pe,
    categories: peCategories,
    trendData: [99.0, 99.0, 98.8, 99.0, 99.0, 99.0, 98.9, 99.0],
  },
  {
    id: 'dra',
    name: 'Drama',
    teacher: 'Ms. Bell',
    period: 6,
    grade: 85.2,
    letterGrade: 'B',
    color: COURSE_COLORS.dra,
    categories: draCategories,
    trendData: [88.5, 87.2, 86.5, 85.8, 85.5, 85.0, 85.1, 85.2],
  },
]

// ─── Semesters & School Years ─────────────────────────────────────────────────
const sem2_2526: Semester = {
  id: 'sem-2025-2026-s2',
  label: 'Semester 2',
  courses: mockCourses,
  startDate: '2026-01-12',
  endDate: '2026-05-30',
}

const sem1_2526: Semester = {
  id: 'sem-2025-2026-s1',
  label: 'Semester 1',
  courses: [
    { ...mockCourses[0], grade: 90.2, letterGrade: 'A-', trendData: [88, 89, 89.5, 90, 90.2, 90.3, 90.2, 90.2] },
    { ...mockCourses[1], grade: 87.5, letterGrade: 'B+', trendData: [86, 87, 87.2, 87.5, 87.5, 87.6, 87.5, 87.5] },
    { ...mockCourses[2], grade: 93.4, letterGrade: 'A', trendData: [92, 92.5, 93, 93.2, 93.4, 93.4, 93.3, 93.4] },
    { ...mockCourses[3], grade: 95.8, letterGrade: 'A', trendData: [95, 95.5, 95.7, 95.8, 95.8, 95.9, 95.8, 95.8] },
    { ...mockCourses[4], grade: 98.5, letterGrade: 'A', trendData: [98, 98.5, 98.5, 98.5, 98.5, 98.5, 98.5, 98.5] },
    { ...mockCourses[5], grade: 86.8, letterGrade: 'B', trendData: [88, 87.5, 87, 87, 86.8, 86.8, 86.8, 86.8] },
  ],
  startDate: '2025-08-22',
  endDate: '2025-12-19',
}

// ── Sophomore mock assignment helper ─────────────────────────────────────────
function soAssignment(
  id: string, catId: string, courseId: string,
  name: string, score: number | null, pts: number,
  status: Assignment['status'], dueDate: string,
  categoryName = ''
): Assignment {
  return {
    id, categoryId: catId, courseId, categoryName, name,
    pointsPossible: pts, score,
    percent: score !== null ? Math.round((score / pts) * 1000) / 10 : null,
    status, dueDate,
    gradedDate: score !== null ? dueDate : '',
  }
}

// Sophomore — full class list, partial assignment data
const sem1_2627_partial: Semester = {
  id: 'sem-2026-2027-s1',
  label: 'Semester 1',
  courses: [
    // ── AP English Language ──────────────────────────────────────────────────
    {
      id: 'ap-eng',
      name: 'AP English Language',
      teacher: 'Ms. Chen',
      period: 1,
      grade: 87.5,
      letterGrade: 'B+',
      color: COURSE_COLORS.eng,
      trendData: [86, 86.5, 87, 87.5, 87.5, 87.5, 87.5, 87.5],
      categories: [
        {
          id: 'ape-essays', courseId: 'ap-eng', name: 'Essays', weight: 50,
          assignments: [
            soAssignment('ape-e1','ape-essays','ap-eng','Rhetorical Analysis #1',     84, 100, 'normal',  '2026-09-05'),
            soAssignment('ape-e2','ape-essays','ap-eng','Synthesis Essay',            87, 100, 'normal',  '2026-09-26'),
            soAssignment('ape-e3','ape-essays','ap-eng','Argument Essay',             89, 100, 'normal',  '2026-10-17'),
            soAssignment('ape-e4','ape-essays','ap-eng','Rhetorical Analysis #2',     null, 100, 'missing', '2026-11-07'),
          ],
        },
        {
          id: 'ape-quiz', courseId: 'ap-eng', name: 'Reading Quizzes', weight: 25,
          assignments: [
            soAssignment('ape-q1','ape-quiz','ap-eng','Quiz — Gatsby Ch. 1–4',   90, 100, 'normal',  '2026-09-12'),
            soAssignment('ape-q2','ape-quiz','ap-eng','Quiz — Gatsby Ch. 5–9',   85, 100, 'normal',  '2026-10-03'),
            soAssignment('ape-q3','ape-quiz','ap-eng','Quiz — 1984 Part I',       88, 100, 'normal',  '2026-10-24'),
          ],
        },
        {
          id: 'ape-class', courseId: 'ap-eng', name: 'Classwork', weight: 25,
          assignments: [
            soAssignment('ape-c1','ape-class','ap-eng','Socratic Seminar #1',     92, 100, 'normal',  '2026-09-19'),
            soAssignment('ape-c2','ape-class','ap-eng','Annotation Check #1',     95, 100, 'normal',  '2026-10-10'),
            soAssignment('ape-c3','ape-class','ap-eng','Peer Review Workshop',    88, 100, 'normal',  '2026-10-31'),
          ],
        },
      ],
    },

    // ── Geometry Honors ───────────────────────────────────────────────────────
    {
      id: 'geo',
      name: 'Geometry Honors',
      teacher: 'Mr. Patel',
      period: 2,
      grade: 92.3,
      letterGrade: 'A-',
      color: COURSE_COLORS.alg,
      trendData: [91, 91.5, 92, 92.3, 92.3, 92.3, 92.3, 92.3],
      categories: [
        {
          id: 'geo-tests', courseId: 'geo', name: 'Tests', weight: 45,
          assignments: [
            soAssignment('geo-t1','geo-tests','geo','Unit 1 Test — Lines & Angles',    94, 100, 'normal', '2026-09-08'),
            soAssignment('geo-t2','geo-tests','geo','Unit 2 Test — Triangles',         91, 100, 'normal', '2026-10-06'),
            soAssignment('geo-t3','geo-tests','geo','Unit 3 Test — Congruence',        93, 100, 'normal', '2026-11-03'),
          ],
        },
        {
          id: 'geo-hw', courseId: 'geo', name: 'Homework', weight: 30,
          assignments: [
            soAssignment('geo-h1','geo-hw','geo','HW 1.1–1.4',  100, 100, 'normal', '2026-08-29'),
            soAssignment('geo-h2','geo-hw','geo','HW 2.1–2.3',   95, 100, 'normal', '2026-09-19'),
            soAssignment('geo-h3','geo-hw','geo','HW 2.4–2.6',   90, 100, 'normal', '2026-10-10'),
            soAssignment('geo-h4','geo-hw','geo','HW 3.1–3.3',   null, 100, 'late',  '2026-10-24'),
          ],
        },
        {
          id: 'geo-quiz', courseId: 'geo', name: 'Quizzes', weight: 25,
          assignments: [
            soAssignment('geo-q1','geo-quiz','geo','Quiz 1.1 — Angle Pairs',   96, 100, 'normal', '2026-09-01'),
            soAssignment('geo-q2','geo-quiz','geo','Quiz 2.1 — Triangle Sum',   88, 100, 'normal', '2026-09-29'),
            soAssignment('geo-q3','geo-quiz','geo','Quiz 3.1 — Congruence',     92, 100, 'normal', '2026-10-27'),
          ],
        },
      ],
    },

    // ── Chemistry ─────────────────────────────────────────────────────────────
    {
      id: 'chem',
      name: 'Chemistry',
      teacher: 'Dr. Nguyen',
      period: 3,
      grade: 89.4,
      letterGrade: 'B+',
      color: COURSE_COLORS.bio,
      trendData: [87, 88, 88.5, 89, 89.4, 89.4, 89.4, 89.4],
      categories: [
        {
          id: 'che-tests', courseId: 'chem', name: 'Tests', weight: 50,
          assignments: [
            soAssignment('che-t1','che-tests','chem','Unit 1 Test — Matter & Energy',  91, 100, 'normal', '2026-09-10'),
            soAssignment('che-t2','che-tests','chem','Unit 2 Test — Atomic Structure', 88, 100, 'normal', '2026-10-08'),
            soAssignment('che-t3','che-tests','chem','Unit 3 Test — Bonding',          87, 100, 'normal', '2026-11-05'),
          ],
        },
        {
          id: 'che-labs', courseId: 'chem', name: 'Labs', weight: 30,
          assignments: [
            soAssignment('che-l1','che-labs','chem','Lab 1 — Density & Measurement', 95, 100, 'normal', '2026-09-03'),
            soAssignment('che-l2','che-labs','chem','Lab 2 — Flame Test',            90, 100, 'normal', '2026-09-24'),
            soAssignment('che-l3','che-labs','chem','Lab 3 — Electron Config.',       88, 100, 'normal', '2026-10-15'),
            soAssignment('che-l4','che-labs','chem','Lab 4 — Molecular Models',       null, 100, 'missing', '2026-11-12'),
          ],
        },
        {
          id: 'che-hw', courseId: 'chem', name: 'Homework', weight: 20,
          assignments: [
            soAssignment('che-h1','che-hw','chem','HW — Matter Classification',   85, 100, 'normal', '2026-08-28'),
            soAssignment('che-h2','che-hw','chem','HW — Atomic History',           90, 100, 'normal', '2026-09-18'),
            soAssignment('che-h3','che-hw','chem','HW — Periodic Trends',          88, 100, 'normal', '2026-10-09'),
          ],
        },
      ],
    },

    // ── World History ─────────────────────────────────────────────────────────
    {
      id: 'whist',
      name: 'World History',
      teacher: 'Mr. Thompson',
      period: 4,
      grade: 91.2,
      letterGrade: 'A-',
      color: COURSE_COLORS.fre,
      trendData: [89, 90, 90.5, 91, 91.2, 91.2, 91.2, 91.2],
      categories: [
        {
          id: 'wh-tests', courseId: 'whist', name: 'Tests', weight: 40,
          assignments: [
            soAssignment('wh-t1','wh-tests','whist','Unit 1 Test — Ancient Civs.',  92, 100, 'normal', '2026-09-12'),
            soAssignment('wh-t2','wh-tests','whist','Unit 2 Test — Middle Ages',    90, 100, 'normal', '2026-10-10'),
            soAssignment('wh-t3','wh-tests','whist','Unit 3 Test — Renaissance',    93, 100, 'normal', '2026-11-07'),
          ],
        },
        {
          id: 'wh-essays', courseId: 'whist', name: 'Essays', weight: 35,
          assignments: [
            soAssignment('wh-e1','wh-essays','whist','DBQ — Rise of Civilizations', 89, 100, 'normal', '2026-09-26'),
            soAssignment('wh-e2','wh-essays','whist','Essay — Feudal Systems',       91, 100, 'normal', '2026-10-24'),
          ],
        },
        {
          id: 'wh-hw', courseId: 'whist', name: 'Homework', weight: 25,
          assignments: [
            soAssignment('wh-h1','wh-hw','whist','Reading Guide — Ch. 1–2',  95, 100, 'normal', '2026-08-28'),
            soAssignment('wh-h2','wh-hw','whist','Reading Guide — Ch. 3–4',  92, 100, 'normal', '2026-09-18'),
            soAssignment('wh-h3','wh-hw','whist','Map Activity — Trade Routes', 88, 100, 'late',  '2026-10-02'),
            soAssignment('wh-h4','wh-hw','whist','Reading Guide — Ch. 7–8',  90, 100, 'normal', '2026-10-23'),
          ],
        },
      ],
    },

    // ── Spanish 2 ─────────────────────────────────────────────────────────────
    {
      id: 'spa2',
      name: 'Spanish 2',
      teacher: 'Sra. Rivera',
      period: 5,
      grade: 94.1,
      letterGrade: 'A',
      color: COURSE_COLORS.dra,
      trendData: [92, 93, 93.5, 94, 94.1, 94.1, 94.1, 94.1],
      categories: [
        {
          id: 'sp-tests', courseId: 'spa2', name: 'Tests', weight: 40,
          assignments: [
            soAssignment('sp-t1','sp-tests','spa2','Unit 1 Test — Present Tense',    95, 100, 'normal', '2026-09-08'),
            soAssignment('sp-t2','sp-tests','spa2','Unit 2 Test — Past Tense',       93, 100, 'normal', '2026-10-06'),
            soAssignment('sp-t3','sp-tests','spa2','Unit 3 Test — Subjunctive',      94, 100, 'normal', '2026-11-03'),
          ],
        },
        {
          id: 'sp-oral', courseId: 'spa2', name: 'Oral Assessments', weight: 30,
          assignments: [
            soAssignment('sp-o1','sp-oral','spa2','Oral Exam 1 — Introductions', 97, 100, 'normal', '2026-09-15'),
            soAssignment('sp-o2','sp-oral','spa2','Oral Exam 2 — Narration',     95, 100, 'normal', '2026-10-13'),
          ],
        },
        {
          id: 'sp-hw', courseId: 'spa2', name: 'Homework', weight: 30,
          assignments: [
            soAssignment('sp-h1','sp-hw','spa2','Workbook — Unidad 1',   92, 100, 'normal', '2026-08-28'),
            soAssignment('sp-h2','sp-hw','spa2','Workbook — Unidad 2',   94, 100, 'normal', '2026-09-25'),
            soAssignment('sp-h3','sp-hw','spa2','Workbook — Unidad 3',   96, 100, 'normal', '2026-10-23'),
          ],
        },
      ],
    },

    // ── Physical Education ────────────────────────────────────────────────────
    {
      id: 'pe2',
      name: 'Physical Education',
      teacher: 'Coach Davis',
      period: 6,
      grade: 98.0,
      letterGrade: 'A',
      color: COURSE_COLORS.pe,
      trendData: [97, 98, 98, 98, 98, 98, 98, 98],
      categories: [
        {
          id: 'pe2-part', courseId: 'pe2', name: 'Participation', weight: 60,
          assignments: [
            soAssignment('pe2-p1','pe2-part','pe2','Week 1–2 Participation',   100, 100, 'normal', '2026-09-05'),
            soAssignment('pe2-p2','pe2-part','pe2','Week 3–4 Participation',   100, 100, 'normal', '2026-09-19'),
            soAssignment('pe2-p3','pe2-part','pe2','Week 5–6 Participation',    95, 100, 'normal', '2026-10-03'),
            soAssignment('pe2-p4','pe2-part','pe2','Week 7–8 Participation',   100, 100, 'normal', '2026-10-17'),
          ],
        },
        {
          id: 'pe2-skills', courseId: 'pe2', name: 'Skills Tests', weight: 25,
          assignments: [
            soAssignment('pe2-s1','pe2-skills','pe2','Fitness Assessment',      98, 100, 'normal', '2026-09-12'),
            soAssignment('pe2-s2','pe2-skills','pe2','Basketball Skills Test',  96, 100, 'normal', '2026-10-10'),
          ],
        },
        {
          id: 'pe2-written', courseId: 'pe2', name: 'Written Work', weight: 15,
          assignments: [
            soAssignment('pe2-w1','pe2-written','pe2','Fitness Goal Essay',    100, 100, 'normal', '2026-09-26'),
          ],
        },
      ],
    },
  ],
  startDate: '2026-08-21',
  endDate: '2026-12-18',
}

const sem2_2627_upcoming: Semester = {
  id: 'sem-2026-2027-s2',
  label: 'Semester 2',
  courses: [],
  startDate: '2027-01-15',
  endDate: '2027-05-28',
}

export const mockSchoolYears: SchoolYear[] = [
  {
    id: 'yr-2025-2026',
    yearLabel: '2025–2026',
    gradeLevel: 'Freshman',
    gradYear: 2029,
    hasData: true,
    isPartial: false,
    semesters: [sem1_2526, sem2_2526],
  },
  {
    id: 'yr-2026-2027',
    yearLabel: '2026–2027',
    gradeLevel: 'Sophomore',
    gradYear: 2029,
    hasData: true,
    isPartial: true,
    semesters: [sem1_2627_partial, sem2_2627_upcoming],
  },
  {
    id: 'yr-2027-2028',
    yearLabel: '2027–2028',
    gradeLevel: 'Junior',
    gradYear: 2029,
    hasData: false,
    isPartial: false,
    semesters: [],
  },
  {
    id: 'yr-2028-2029',
    yearLabel: '2028–2029',
    gradeLevel: 'Senior',
    gradYear: 2029,
    hasData: false,
    isPartial: false,
    semesters: [],
  },
]

// ─── Analytics (Freshman 2025-2026, full year) ────────────────────────────────
export const mockAnalytics: AnalyticsSummary = {
  missingCount: 2,
  lateCount: 1,
  averageGrade: 92.1,
  bestYear: 'Freshman',
  bestYearNote: 'Only year with complete data',
  hardestYear: 'Freshman',
  hardestYearNote: 'Only year with complete data — weighted by assignments, drops & volatility',
  easiestYear: 'Freshman',
  mostImproved: 'Incomplete data',
  bestClass: 'French 1',
  hardestClass: 'Drama',
  mostAssignmentHeavy: 'Biology Honors',
  firstGradeDate: '2025-08-22',
  lastGradeDate: '2026-05-30',
}

// ─── Recent Updates ───────────────────────────────────────────────────────────
export const mockRecentUpdates: RecentUpdate[] = [
  {
    id: 'u1',
    type: 'grade_updated',
    courseId: 'bio',
    courseName: 'Biology Honors',
    description: 'Chapter 7 Quiz graded: 16/20 (80%)',
    date: '2026-03-19',
  },
  {
    id: 'u2',
    type: 'missing_flagged',
    courseId: 'bio',
    courseName: 'Biology Honors',
    description: 'Enzyme Lab Report is now marked missing',
    date: '2026-03-18',
  },
  {
    id: 'u3',
    type: 'grade_updated',
    courseId: 'fre',
    courseName: 'French 1',
    description: 'Story Retelling graded: 25/25 (100%)',
    date: '2026-03-17',
  },
  {
    id: 'u4',
    type: 'assignment_added',
    courseId: 'alg',
    courseName: 'Algebra 2 Honors',
    description: 'Chapter 7 Test added — due 2026-03-28',
    date: '2026-03-17',
  },
  {
    id: 'u5',
    type: 'late_flagged',
    courseId: 'dra',
    courseName: 'Drama',
    description: 'Scene Analysis Paper was marked late',
    date: '2026-03-16',
  },
  {
    id: 'u6',
    type: 'grade_updated',
    courseId: 'eng',
    courseName: 'English 1 / Literature',
    description: 'Literary Analysis Essay graded: 93/100 (93%)',
    date: '2026-03-12',
  },
]

// ─── Mock Emails ──────────────────────────────────────────────────────────────
export const mockEmails: MockEmail[] = [
  {
    id: 'e1',
    sender: 'Ms. Okafor',
    senderEmail: 'okafor@school.edu',
    senderType: 'teacher',
    subject: 'Missing Lab Assignment',
    snippet: 'Hello, I wanted to remind you that the Enzyme Lab report is now past due. Please submit it as soon as possible.',
    date: '2026-03-18',
    unread: true,
    priority: 'High',
    detectedClass: 'Biology Honors',
    gmailLink: '#',
  },
  {
    id: 'e2',
    sender: 'Mr. Tanaka',
    senderEmail: 'tanaka@school.edu',
    senderType: 'teacher',
    subject: 'Chapter 7 Test – This Friday',
    snippet: 'Just a reminder that we have a test on Friday covering sections 7.1–7.4. Review your notes on logarithms.',
    date: '2026-03-17',
    unread: true,
    priority: 'High',
    detectedClass: 'Algebra 2 Honors',
    gmailLink: '#',
  },
  {
    id: 'e3',
    sender: 'Jordan K.',
    senderEmail: 'jordan@students.school.edu',
    senderType: 'friend',
    subject: 'Study group for Bio test?',
    snippet: 'Hey, want to study together for the genetics unit? I\'m free Saturday afternoon.',
    date: '2026-03-17',
    unread: true,
    priority: 'Low',
    detectedClass: 'Biology Honors',
    gmailLink: '#',
  },
  {
    id: 'e4',
    sender: 'Ms. Bell',
    senderEmail: 'bell@school.edu',
    senderType: 'teacher',
    subject: 'Late Work Policy – Reminder',
    snippet: 'Please note that late assignments receive a 10% deduction per day. The Scene Analysis Paper deadline has passed.',
    date: '2026-03-16',
    unread: false,
    priority: 'Med',
    detectedClass: 'Drama',
    gmailLink: '#',
  },
  {
    id: 'e5',
    sender: 'Mme. Laurent',
    senderEmail: 'laurent@school.edu',
    senderType: 'teacher',
    subject: 'Extra Credit Opportunity',
    snippet: 'Bonjour! There is an extra credit opportunity for those who attend the French Cultural Fair next Tuesday.',
    date: '2026-03-15',
    unread: false,
    priority: 'Med',
    detectedClass: 'French 1',
    gmailLink: '#',
  },
  {
    id: 'e6',
    sender: 'Mr. Russo',
    senderEmail: 'russo@school.edu',
    senderType: 'teacher',
    subject: 'Essay Feedback Posted',
    snippet: 'Your Literary Analysis Essay feedback has been posted to the gradebook. Great work on your thesis development.',
    date: '2026-03-13',
    unread: false,
    priority: 'Med',
    detectedClass: 'English 1 / Literature',
    gmailLink: '#',
  },
  {
    id: 'e7',
    sender: 'Alex M.',
    senderEmail: 'alex@students.school.edu',
    senderType: 'friend',
    subject: 'Notes from today',
    snippet: 'Sending you the notes from today\'s Algebra class since you had to leave early. Hope you feel better!',
    date: '2026-03-14',
    unread: false,
    priority: 'Low',
    detectedClass: 'Algebra 2 Honors',
    gmailLink: '#',
  },
]

// ─── Derived helpers ──────────────────────────────────────────────────────────

export function getAllAssignments(semester: Semester): Assignment[] {
  return semester.courses.flatMap(c =>
    c.categories.flatMap(cat => cat.assignments)
  )
}

export function getMissingAndLate(semester: Semester): Assignment[] {
  return getAllAssignments(semester).filter(
    a => a.status === 'missing' || a.status === 'late'
  )
}

export function getCourseById(courseId: string, semester: Semester): Course | undefined {
  return semester.courses.find(c => c.id === courseId)
}
