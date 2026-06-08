import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { SchoolYear, Semester, Course, Category, Assignment, AnalyticsSummary } from '@/lib/types'

const DATA_PATH = path.join(process.cwd(), 'data', 'schoology-data.json')

// ── Helpers ────────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseGrade(g: string): { letter: string; pct: number } {
  const m = g.match(/([A-F][+-]?)\s*\(([0-9.]+)%\)/)
  if (m) return { letter: m[1], pct: parseFloat(m[2]) }
  const p = g.match(/([0-9.]+)%/)
  if (p) return { letter: '', pct: parseFloat(p[1]) }
  return { letter: g, pct: 0 }
}

function parseDateUS(s: string): string {
  if (!s) return ''
  // Allow trailing time component (e.g. "1/06/26 8:30am") — just parse the date part
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!m) return ''
  const [, mo, dy, yr] = m
  const year = yr.length === 2 ? `20${yr}` : yr
  return `${year}-${mo.padStart(2, '0')}-${dy.padStart(2, '0')}`
}

function cleanName(raw: string): string {
  return raw
    // Strip Schoology "not available" annotation appended to the name
    .replace(/Note:\s*This material[^]*?Schoology\.?/i, '')
    // Strip trailing type labels injected by visually-hidden spans (no space before them)
    .replace(/\s*(external-tool-link|external-tool)\s*$/i, '')
    .replace(/\s*(test-quiz|test-|assignment|quiz)\s*$/i, '')
    .replace(/^(test-quiz|test-|assignment|quiz)\s*/i, '')
    // Strip "Category" suffix on category names
    .replace(/Category$/i, '')
    .trim()
}

function cleanMaxGrade(s: string): number {
  const n = parseFloat(s.replace(/^\/\s*/, '').trim())
  return isNaN(n) ? 0 : n
}

const COLOR_RULES: [RegExp, string][] = [
  [/algebra|trig|calc|math/,           'var(--color-alg)'],
  [/bio|science|chem|physics/,         'var(--color-bio)'],
  [/english|lit|writ/,                 'var(--color-eng)'],
  [/french|spanish|german|japanese/,   'var(--color-fre)'],
  [/^pe\b|physical.?ed|gym|fitness/,   'var(--color-pe)'],
  [/drama|art|music|theatre|dance/,    'var(--color-dra)'],
]
const FALLBACK_COLORS = [
  'var(--color-alg)', 'var(--color-bio)', 'var(--color-eng)',
  'var(--color-fre)', 'var(--color-pe)',  'var(--color-dra)',
]

function pickColor(name: string, idx: number): string {
  const n = name.toLowerCase()
  for (const [re, color] of COLOR_RULES) if (re.test(n)) return color
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

// ── Transform scraped → frontend types ────────────────────────────────────────

type ScrapedAssignment = {
  name: string; score: string | number; maxGrade: string; dueDate: string
  status?: 'graded' | 'submitted' | 'unsubmitted'
}
type ScrapedData = {
  scrapedAt: number
  gradingPeriod?: string
  courses: {
    name: string; grade: string; teacher: string; href: string
    categories: {
      name: string; weight: string
      assignments: ScrapedAssignment[]
    }[]
  }[]
}

const TODAY = new Date().toISOString().split('T')[0]

function mapStatus(sa: ScrapedAssignment): import('@/lib/types').AssignmentStatus {
  if (sa.status === 'submitted') return 'submitted'
  if (sa.status === 'graded')    return 'normal'

  // Schoology never renders a `.max-grade` element for ungraded work — the
  // grade cell is just a bare "—" (`<span class="no-grade">`) — so every
  // `unsubmitted` item scrapes with an empty `maxGrade`. Trust the scraper's
  // definitive classification directly here, gated only on the due date; the
  // maxGrade-based "can't be missing" heuristic below is a fallback for items
  // with no scraped status at all, and must not run first or it swallows
  // every real missing assignment as "normal" (which is what was happening).
  if (sa.status === 'unsubmitted') {
    const due = parseDateUS(String(sa.dueDate ?? ''))
    return (due && due < TODAY) ? 'missing' : 'normal'
  }

  const scoreStr = sa.score != null ? String(sa.score).trim() : ''
  const hasScore = scoreStr !== '' && scoreStr !== '-'

  // Items with no max points can't meaningfully be "missing" (extra credit, participation, etc.)
  const maxStr = sa.maxGrade != null ? String(sa.maxGrade).replace(/^\/\s*/, '').trim() : ''
  const maxVal = parseFloat(maxStr)
  if (!hasScore && (maxStr === '' || isNaN(maxVal) || maxVal === 0)) return 'normal'

  if (!hasScore) {
    const due = parseDateUS(String(sa.dueDate ?? ''))
    if (due && due < TODAY) return 'missing'
  }
  return 'normal'
}

function transform(data: ScrapedData): { years: SchoolYear[]; analytics: AnalyticsSummary } {
  const courses: Course[] = data.courses.map((sc, idx) => {
    const { letter, pct } = parseGrade(sc.grade)
    const courseId = slugify(sc.name) || `course-${idx}`

    const categories: Category[] = sc.categories
      .filter(cat => cat.assignments.length > 0)  // drop empty duplicate periods
      .map((cat, ci) => {
        const catName = cleanName(cat.name) || `Category ${ci + 1}`
        const catId   = `${courseId}-${slugify(catName) || `cat${ci}`}`
        const weight  = parseFloat(cat.weight) || 0

        const assignments: Assignment[] = cat.assignments.map((a, ai) => {
          const aName = cleanName(a.name) || a.name
          const score = a.score ? parseFloat(String(a.score)) : null
          const max   = cleanMaxGrade(String(a.maxGrade ?? ''))
          const dueDate = parseDateUS(a.dueDate)
          return {
            id: `${catId}-${ai}`,
            name: aName,
            courseId,
            categoryId: catId,
            categoryName: catName,
            score: (score !== null && isNaN(score)) ? null : score,
            pointsPossible: max,
            percent: (score !== null && !isNaN(score) && max > 0)
              ? Math.round(score / max * 1000) / 10
              : null,
            status: mapStatus(a),
            gradedDate: dueDate,
            dueDate,
          }
        })

        return { id: catId, courseId, name: catName, weight, assignments }
      })

    // trendData: running average over graded assignments (8 sample points)
    const graded = categories.flatMap(c =>
      c.assignments.filter(a => a.score !== null && a.pointsPossible > 0)
    )
    let trendData: number[]
    if (graded.length >= 4) {
      const step = Math.ceil(graded.length / 8)
      trendData = Array.from({ length: 8 }, (_, i) => {
        const slice = graded.slice(0, Math.max(1, (i + 1) * step))
        const tot   = slice.reduce((s, a) => s + a.score!, 0)
        const max   = slice.reduce((s, a) => s + a.pointsPossible, 0)
        return max > 0 ? Math.round(tot / max * 1000) / 10 : pct
      })
    } else {
      trendData = Array(8).fill(pct)
    }

    return {
      id:          courseId,
      name:        sc.name,
      teacher:     sc.teacher,
      period:      idx + 1,
      grade:       pct,
      letterGrade: letter,
      color:       pickColor(sc.name, idx),
      categories,
      trendData,
    }
  })

  const semester: Semester = {
    id:        'sem-2025-2026-s2',
    label:     'Semester 2',
    startDate: '2026-01-07',
    endDate:   '2026-06-06',
    courses,
  }

  const year: SchoolYear = {
    id:         'yr-2025-2026',
    yearLabel:  '2025–2026',
    gradeLevel: 'Freshman',
    gradYear:   2029,
    hasData:    courses.length > 0,
    isPartial:  false,
    semesters:  [semester],
  }

  // Compute analytics from real data
  const allAssignments = courses.flatMap(c => c.categories.flatMap(cat => cat.assignments))
  const missingCount   = allAssignments.filter(a => a.status === 'missing').length
  const lateCount      = allAssignments.filter(a => a.status === 'late').length

  const gradeValues = courses.filter(c => c.grade > 0)
  const avg = gradeValues.length
    ? Math.round(gradeValues.reduce((s, c) => s + c.grade, 0) / gradeValues.length * 10) / 10
    : 0
  const sorted = [...gradeValues].sort((a, b) => b.grade - a.grade)
  const byAssignments = [...courses].sort((a, b) =>
    b.categories.flatMap(c => c.assignments).length -
    a.categories.flatMap(c => c.assignments).length
  )

  const analytics: AnalyticsSummary = {
    missingCount,
    lateCount,
    averageGrade:         avg,
    bestYear:             '2025–2026',
    bestYearNote:         `${sorted[0]?.letterGrade ?? ''} avg in ${sorted[0]?.name ?? ''}`,
    hardestYear:          '2025–2026',
    hardestYearNote:      '',
    easiestYear:          '2025–2026',
    mostImproved:         sorted[0]?.name ?? '',
    bestClass:            sorted[0]?.name ?? '',
    hardestClass:         sorted[sorted.length - 1]?.name ?? '',
    mostAssignmentHeavy:  byAssignments[0]?.name ?? '',
    firstGradeDate:       '',
    lastGradeDate:        new Date(data.scrapedAt).toISOString().split('T')[0],
  }

  return { years: [year], analytics }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return NextResponse.json({ years: [], analytics: null, scrapedAt: null })
    }
    const data: ScrapedData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    const { years, analytics } = transform(data)
    return NextResponse.json({ years, analytics, scrapedAt: data.scrapedAt })
  } catch (e) {
    console.error('[api/grades]', e)
    return NextResponse.json(
      { years: [], analytics: null, scrapedAt: null, error: String(e) },
      { status: 500 }
    )
  }
}
