import type { Assignment, Course } from '@/lib/types'

type UpcomingItem = {
  assignment: Assignment
  course: Course
}

type Props = {
  items: UpcomingItem[]
  fill?: boolean  // stretch card to fill parent height
}

function dueLabel(dateStr: string): string {
  const due = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.round(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 6) return `In ${diffDays} days`
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function UpcomingSection({ items, fill }: Props) {
  return (
    <section aria-label="Upcoming assignments" className={fill ? 'flex flex-col flex-1 min-h-0' : undefined}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Upcoming
        </h2>
        {items.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            next 7 days
          </span>
        )}
      </div>

      <div className={`rounded-xl border border-border bg-card overflow-hidden${fill ? ' flex-1' : ''}`}>
        {items.length === 0 ? (
          <p className="flex h-full items-center justify-center px-4 py-3 text-xs text-muted-foreground">
            Nothing due this week
          </p>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {items.map(({ assignment, course }) => (
              <li key={assignment.id} className="flex items-center gap-3 px-4 py-2.5">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: course.color }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-card-foreground">
                    {assignment.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {course.name}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-medium text-foreground/70">
                    {dueLabel(assignment.dueDate)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
