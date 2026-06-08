import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/shared/status-chip'
import type { Assignment, Course } from '@/lib/types'

type Props = {
  assignment: Assignment
  course: Course
}

function pctColor(pct: number) {
  if (pct >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 90) return 'text-green-600 dark:text-green-400'
  if (pct >= 80) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

// Shorten course name to first 2 meaningful words for the badge
function shortCourseName(name: string) {
  const words = name.split(' ').filter((w) => w.length > 1)
  return words.slice(0, 2).join(' ')
}

export function AssignmentRow({ assignment: a, course }: Props) {
  const isUnscored = a.score === null && a.status !== 'missing' && a.status !== 'late'
  const isMissing = a.status === 'missing' || a.status === 'late'

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_130px_92px_72px_88px] items-center gap-3 border-b border-border/50 py-2.5 pr-4 last:border-b-0 hover:bg-muted/20 transition-colors',
        isUnscored && 'opacity-60',
      )}
      style={{ paddingLeft: '0' }}
    >
      {/* Left color strip + name/badges */}
      <div className="flex items-center gap-3 min-w-0 pl-0">
        <div
          className="self-stretch w-[3px] shrink-0 rounded-r-full"
          style={{ backgroundColor: course.color }}
          aria-hidden="true"
        />
        <div className="min-w-0 pl-1">
          <p className={cn(
            'truncate text-[13px] font-medium leading-snug',
            isMissing ? 'text-destructive' : 'text-card-foreground'
          )}>
            {a.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
              style={{ backgroundColor: course.color, color: 'var(--band-fg)' }}
            >
              {shortCourseName(course.name)}
            </span>
            <span className="text-[10px] text-muted-foreground">{a.categoryName}</span>
          </div>
        </div>
      </div>

      {/* Due date */}
      <span className="text-xs text-muted-foreground tabular-nums">
        {new Date(a.dueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: '2-digit',
        })}
      </span>

      {/* Score */}
      <span className={cn(
        'text-xs tabular-nums text-right',
        a.score !== null ? 'text-muted-foreground' : 'text-muted-foreground/35'
      )}>
        {a.score !== null ? `${a.score} / ${a.pointsPossible}` : `— / ${a.pointsPossible}`}
      </span>

      {/* Percent */}
      <span className={cn(
        'text-xs font-medium tabular-nums text-right',
        a.percent !== null ? pctColor(a.percent) : 'text-muted-foreground/35'
      )}>
        {a.percent !== null ? `${a.percent.toFixed(1)}%` : '—'}
      </span>

      {/* Status */}
      <div className="flex justify-start">
        {a.status !== 'normal' ? (
          <StatusChip status={a.status} />
        ) : a.score !== null ? (
          <span className="text-[10px] text-muted-foreground/50">Graded</span>
        ) : (
          <span className="text-[10px] font-medium text-primary/70">Upcoming</span>
        )}
      </div>
    </div>
  )
}
