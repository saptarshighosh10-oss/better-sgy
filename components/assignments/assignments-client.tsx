'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/use-app-store'
import { useSchoolYears } from '@/lib/use-grades'
import { AssignmentRow } from './assignment-row'
import type { Assignment, Course } from '@/lib/types'

const NOW       = new Date()
const WEEK_END  = new Date(NOW.getTime() + 7  * 24 * 60 * 60 * 1000)
const WEEK2_END = new Date(NOW.getTime() + 14 * 24 * 60 * 60 * 1000)

type GroupKey = 'thisWeek' | 'nextWeek' | 'later' | 'past'
type StatusFilter = 'all' | 'graded' | 'missing' | 'submitted' | 'todo'

const GROUP_LABELS: Record<GroupKey, string> = {
  thisWeek: 'This Week',
  nextWeek: 'Next Week',
  later:    'Later',
  past:     'Past',
}
const GROUP_ORDER: GroupKey[] = ['thisWeek', 'nextWeek', 'later', 'past']

const GROUP_ACCENT: Record<GroupKey, string> = {
  thisWeek: 'bg-primary',
  nextWeek: 'bg-amber-500',
  later:    'bg-muted-foreground/30',
  past:     'bg-muted-foreground/20',
}

const GROUP_BADGE: Record<GroupKey, string> = {
  thisWeek: 'bg-primary/10 text-primary',
  nextWeek: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  later:    'bg-muted text-muted-foreground',
  past:     'bg-muted text-muted-foreground',
}

function getGroup(a: Assignment): GroupKey {
  // Anything already actioned — graded, submitted, missing, excused, incomplete, late — goes to past
  if (
    a.score !== null ||
    a.status === 'missing' ||
    a.status === 'late' ||
    a.status === 'submitted' ||
    a.status === 'excused' ||
    a.status === 'incomplete'
  ) return 'past'
  const due = new Date(a.dueDate)
  if (due <= WEEK_END)  return 'thisWeek'
  if (due <= WEEK2_END) return 'nextWeek'
  return 'later'
}

// When a specific status filter is active, rename the "Past" group to match what's shown
function pastLabel(filter: StatusFilter): string {
  if (filter === 'submitted') return 'Submitted'
  if (filter === 'missing')   return 'Missing'
  if (filter === 'graded')    return 'Graded'
  return 'Past'
}

const PAST_PREVIEW = 8

export function AssignmentsClient() {
  const selectedYearId     = useAppStore((s) => s.selectedYearId)
  const selectedSemesterId = useAppStore((s) => s.selectedSemesterId)
  const { schoolYears }    = useSchoolYears()

  const year     = schoolYears.find((y) => y.id === selectedYearId) ?? schoolYears[0]
  const semester = year?.semesters.find((s) => s.id === selectedSemesterId) ?? year?.semesters[0]

  const [activeCourses, setActiveCourses] = useState<Set<string>>(
    () => new Set(semester?.courses.map((c) => c.id) ?? [])
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAllPast, setShowAllPast] = useState(false)

  const allItems = useMemo<{ assignment: Assignment; course: Course }[]>(() => {
    if (!semester) return []
    return semester.courses.flatMap((course) =>
      course.categories.flatMap((cat) =>
        cat.assignments.map((assignment) => ({ assignment, course }))
      )
    )
  }, [semester])

  const filtered = useMemo(() => {
    return allItems.filter(({ assignment: a, course }) => {
      if (!activeCourses.has(course.id)) return false
      if (statusFilter === 'graded')    return a.score !== null
      if (statusFilter === 'missing')   return a.status === 'missing' || a.status === 'late' || a.status === 'incomplete'
      if (statusFilter === 'submitted') return a.status === 'submitted' || a.status === 'excused'
      if (statusFilter === 'todo')      return a.status === 'normal'
      return true
    })
  }, [allItems, activeCourses, statusFilter])

  const groups = useMemo(() => {
    const g: Record<GroupKey, typeof filtered> = {
      thisWeek: [], nextWeek: [], later: [], past: [],
    }
    for (const item of filtered) {
      g[getGroup(item.assignment)].push(item)
    }
    for (const key of GROUP_ORDER) {
      g[key].sort(
        (a, b) =>
          new Date(a.assignment.dueDate).getTime() -
          new Date(b.assignment.dueDate).getTime()
      )
    }
    return g
  }, [filtered])

  function toggleCourse(id: string) {
    setActiveCourses((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (!semester) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">No assignment data available.</p>
      </div>
    )
  }

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'all',       label: 'All' },
    { value: 'todo',      label: 'To Do' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'graded',    label: 'Graded' },
    { value: 'missing',   label: 'Missing' },
  ]

  return (
    <div className="w-full px-5 py-5">
      {/* Page header */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Assignments
        </p>
        <h1 className="mt-0.5 text-base font-semibold text-foreground">
          {year?.yearLabel} · {year?.gradeLevel}
        </h1>
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Course pills */}
        <div className="flex flex-wrap gap-1.5">
          {semester.courses.map((course) => {
            const active = activeCourses.has(course.id)
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => toggleCourse(course.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-transparent'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                )}
                style={active ? { backgroundColor: course.color, color: 'var(--band-fg)' } : {}}
                aria-pressed={active}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={active ? { backgroundColor: 'var(--band-fg)' } : { backgroundColor: course.color }}
                  aria-hidden="true"
                />
                {course.name.split(' ').slice(0, 2).join(' ')}
              </button>
            )
          })}
        </div>

        <div className="h-5 w-px bg-border" aria-hidden="true" />

        {/* Status filter */}
        <div className="flex gap-1">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                statusFilter === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-pressed={statusFilter === value}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Total count */}
        <span className="ml-auto text-[11px] text-muted-foreground/70 tabular-nums">
          {filtered.length} assignment{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Groups */}
      <div className="space-y-5">
        {GROUP_ORDER.map((key) => {
          const items = groups[key]
          if (items.length === 0) return null

          const isPast        = key === 'past'
          const displayItems  = isPast && !showAllPast ? items.slice(0, PAST_PREVIEW) : items
          const hiddenCount   = items.length - PAST_PREVIEW

          return (
            <section key={key} aria-label={GROUP_LABELS[key]}>
              <div className="mb-2 flex items-center gap-2.5">
                <div className={cn('h-3.5 w-1 shrink-0 rounded-full', GROUP_ACCENT[key])} aria-hidden="true" />
                <h2 className={cn(
                  'text-xs font-semibold uppercase tracking-wider',
                  key === 'thisWeek' ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {key === 'past' ? pastLabel(statusFilter) : GROUP_LABELS[key]}
                </h2>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', GROUP_BADGE[key])}>
                  {items.length}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_130px_92px_72px_88px] gap-3 border-b border-border bg-muted/30 py-2 pr-4 pl-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  <span>Assignment</span>
                  <span>Due</span>
                  <span className="text-right">Score</span>
                  <span className="text-right">Percent</span>
                  <span>Status</span>
                </div>

                {displayItems.map(({ assignment, course }) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    course={course}
                  />
                ))}

                {isPast && hiddenCount > 0 && !showAllPast && (
                  <button
                    type="button"
                    onClick={() => setShowAllPast(true)}
                    className="flex w-full items-center justify-center border-t border-border py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Show {hiddenCount} more past assignment{hiddenCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </section>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50" aria-hidden="true">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No assignments found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {statusFilter !== 'all'
                  ? 'Try switching to "All" or selecting a different status.'
                  : 'No assignments match the selected courses.'}
              </p>
            </div>
            {(statusFilter !== 'all' || activeCourses.size < semester.courses.length) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all')
                  setActiveCourses(new Set(semester.courses.map((c) => c.id)))
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
