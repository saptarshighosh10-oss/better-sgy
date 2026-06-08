import type { AssignmentStatus } from '@/lib/types'
import { StatusChip } from '@/components/shared/status-chip'

// Flat shape (rather than full Assignment+Course) so items can come from
// either the gradebook scrape *or* Schoology's home-page "OVERDUE" feed —
// the latter covers courses (e.g. orientation/admin pseudo-courses) that the
// gradebook view deliberately filters out but that can still carry real,
// "hella overdue" work the student should see flagged here too.
export type MissingItem = {
  id:          string
  name:        string
  status:      AssignmentStatus
  dueDate:     string   // ISO date string
  courseName:  string
  courseColor: string
}

type Props = {
  items: MissingItem[]
}

export function MissingSection({ items }: Props) {
  return (
    <section aria-label="To Do">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          To Do
        </h2>
        {items.length > 0 && (
          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
            {items.length}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {items.length === 0 ? (
          <div className="flex items-center gap-2.5 px-4 py-3">
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="shrink-0 text-success"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="text-xs text-muted-foreground">All assignments submitted</p>
          </div>
        ) : (
          <>
            {/* Overdue banner — Schoology-style section marker */}
            <div className="flex items-center gap-1.5 border-b border-destructive/15 bg-destructive/6 px-4 py-1.5">
              <svg
                viewBox="0 0 24 24"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="shrink-0 text-destructive"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                Needs Attention
              </span>
            </div>
          <ul role="list" className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.courseColor }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-card-foreground">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.courseName}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-0.5">
                  <StatusChip status={item.status} />
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(item.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>
    </section>
  )
}
