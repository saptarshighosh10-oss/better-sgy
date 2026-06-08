import { cn } from '@/lib/utils'
import type { Course } from '@/lib/types'

function categoryAverage(assignments: Course['categories'][number]['assignments']): number | null {
  const scored = assignments.filter((a) => a.score !== null && a.pointsPossible > 0)
  if (scored.length === 0) return null
  const pts = scored.reduce((sum, a) => sum + a.score!, 0)
  const max = scored.reduce((sum, a) => sum + a.pointsPossible, 0)
  return max > 0 ? (pts / max) * 100 : null
}

function gradeColor(grade: number) {
  if (grade >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (grade >= 90) return 'text-green-600 dark:text-green-400'
  if (grade >= 87) return 'text-lime-700 dark:text-lime-400'
  if (grade >= 83) return 'text-amber-600 dark:text-amber-400'
  if (grade >= 80) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

export function GradeFormulaStrip({ course }: { course: Course }) {
  const terms = course.categories.map((cat) => ({
    name: cat.name,
    weight: cat.weight,
    avg: categoryAverage(cat.assignments),
  }))

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card px-5 py-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Grade Calculation
      </p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {terms.map((t, i) => (
          <span key={t.name} className="inline-flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-sm text-muted-foreground/40">+</span>
            )}
            <span className="rounded-md bg-muted px-2 py-1 text-[11px]">
              <span className="font-semibold text-foreground">{t.weight}%</span>
              <span className="mx-1 text-muted-foreground/50">×</span>
              <span className={cn(
                'tabular-nums font-medium',
                t.avg !== null ? 'text-foreground' : 'text-muted-foreground/40'
              )}>
                {t.avg !== null ? `${t.avg.toFixed(1)}%` : '—'}
              </span>
              <span className="ml-1.5 text-muted-foreground/50">{t.name}</span>
            </span>
          </span>
        ))}

        <span className="text-sm text-muted-foreground/40">=</span>

        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2.5 py-1">
          <span className={cn('text-base font-bold tabular-nums', gradeColor(course.grade))}>
            {course.grade.toFixed(1)}%
          </span>
          <span className="text-sm font-semibold text-muted-foreground">
            {course.letterGrade}
          </span>
        </span>
      </div>

      <p className="mt-2.5 text-[10px] text-muted-foreground/50">
        Unscored assignments are excluded from the category average until graded.
      </p>
    </div>
  )
}
