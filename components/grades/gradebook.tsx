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

type Props = {
  course: Course
  semesterLabel: string
  isPartial?: boolean
}

export function Gradebook({ course, semesterLabel, isPartial = false }: Props) {
  const totalAssignments = course.categories.reduce(
    (sum, cat) => sum + cat.assignments.length,
    0
  )
  const scoredAssignments = course.categories.reduce(
    (sum, cat) => sum + cat.assignments.filter((a) => a.score !== null).length,
    0
  )
  const missingCount = course.categories.reduce(
    (sum, cat) =>
      sum + cat.assignments.filter((a) => a.status === 'missing' || a.status === 'late').length,
    0
  )

  return (
    <div className="min-w-0 flex-1">
      {/* ── Course header card ───────────────────────────── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
        {/* Color bar */}
        <div className="h-1.5" style={{ backgroundColor: course.color }} aria-hidden="true" />

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
                {course.grade.toFixed(1)}
                <span className="text-2xl">%</span>
              </p>
              <p className="mt-1.5 text-base font-semibold text-muted-foreground">
                {course.letterGrade}
              </p>
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
