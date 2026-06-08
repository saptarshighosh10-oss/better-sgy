import { cn } from '@/lib/utils'
import { CategoryRow } from './category-row'
import { GradeFormulaStrip } from './grade-formula-strip'
import type { Course } from '@/lib/types'

function gradeColor(grade: number) {
  if (grade >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (grade >= 90) return 'text-green-600 dark:text-green-400'
  if (grade >= 87) return 'text-lime-700 dark:text-lime-400'
  if (grade >= 83) return 'text-amber-600 dark:text-amber-400'
  if (grade >= 80) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

function stampBorder(grade: number) {
  if (grade >= 93) return 'border-emerald-500/70 text-emerald-600 dark:border-emerald-400/70 dark:text-emerald-400'
  if (grade >= 90) return 'border-green-500/70 text-green-600 dark:border-green-400/70 dark:text-green-400'
  if (grade >= 87) return 'border-lime-600/70 text-lime-700 dark:border-lime-400/70 dark:text-lime-400'
  if (grade >= 83) return 'border-amber-500/70 text-amber-600 dark:border-amber-400/70 dark:text-amber-400'
  if (grade >= 80) return 'border-orange-500/70 text-orange-500 dark:border-orange-400/70 dark:text-orange-400'
  return 'border-red-500/70 text-red-500 dark:border-red-400/70 dark:text-red-400'
}

function getBandLabel(course: Course): string {
  const n = course.name.toLowerCase()
  const num = course.name.match(/\d+/)?.[0] ?? ''
  if (/algebra|trig/.test(n)) return num ? `ALG ${num}` : 'ALG'
  if (/biology/.test(n))      return 'BIO'
  if (/lit|writ|english/.test(n)) return 'LIT'
  if (/french/.test(n))       return num ? `FR ${num}` : 'FR'
  if (/^pe\b|physical/.test(n)) return num ? `PE ${num}` : 'PE'
  if (/drama|theatre/.test(n)) return 'DRAMA'
  return course.name.split(/[\s/]/)[0].slice(0, 5).toUpperCase()
}

function bandFontSize(abbr: string): string {
  const n = abbr.replace(/\s/g, '').length
  if (n <= 2) return 'text-[72px]'
  if (n === 3) return 'text-[56px]'
  if (n === 4) return 'text-[44px]'
  return 'text-[34px]'
}

type Props = {
  course: Course
  semesterLabel: string
  isPartial?: boolean
}

export function Gradebook({ course, semesterLabel, isPartial = false }: Props) {
  const totalAssignments = course.categories.reduce(
    (sum, cat) => sum + cat.assignments.length, 0
  )
  const scoredAssignments = course.categories.reduce(
    (sum, cat) => sum + cat.assignments.filter((a) => a.score !== null).length, 0
  )
  const missingCount = course.categories.reduce(
    (sum, cat) =>
      sum + cat.assignments.filter((a) => a.status === 'missing' || a.status === 'late').length,
    0
  )

  const abbr = getBandLabel(course)

  return (
    <div className="min-w-0 flex-1">
      {/* ── Course header card ───────────────────────────── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
        {/* Color band with watermark */}
        <div className="relative h-20 overflow-hidden" style={{ backgroundColor: course.color }}>
          <span
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center justify-center font-black leading-none tracking-tight text-[var(--band-watermark)] select-none',
              bandFontSize(abbr)
            )}
            aria-hidden="true"
          >
            {abbr}
          </span>
          <span className="absolute bottom-2.5 left-3 text-sm font-bold text-[var(--band-fg)] leading-none select-none">
            P{course.period}
          </span>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight text-foreground">
                {course.name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {course.teacher} · Period {course.period} · {semesterLabel}
              </p>

              {/* Quick stats row */}
              <div className="mt-3 flex items-center gap-4">
                <span className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">{scoredAssignments}</span>
                  /{totalAssignments} graded
                </span>
                {missingCount > 0 && (
                  <span className="text-[11px] font-semibold text-destructive">
                    {missingCount} {missingCount === 1 ? 'issue' : 'issues'}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {course.categories.length} categories
                </span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className={cn('text-4xl font-bold leading-none tabular-nums', gradeColor(course.grade))}>
                {course.grade.toFixed(2)}
                <span className="text-2xl">%</span>
              </p>
              {/* Letter grade as stamp */}
              <div className="mt-2 flex justify-end">
                <span className={cn(
                  'inline-flex items-center justify-center rounded-lg border-2 px-2.5 py-0.5 text-sm font-black tracking-wider -rotate-2',
                  stampBorder(course.grade)
                )}>
                  {course.letterGrade}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category gradebook table ─────────────────────── */}
      {course.categories.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {course.categories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} />
            ))}
          </div>
          <div className="mt-4">
            <GradeFormulaStrip course={course} />
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-12">
          <p className="text-sm text-muted-foreground">
            {isPartial
              ? 'Detailed category breakdown not yet available — still syncing.'
              : 'No assignment data for this course.'}
          </p>
        </div>
      )}
    </div>
  )
}
