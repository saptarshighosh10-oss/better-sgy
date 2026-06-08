'use client'

import { cn } from '@/lib/utils'
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
  courses: Course[]
  selectedId: string
  onSelect: (id: string) => void
}

export function CourseSidebar({ courses, selectedId, onSelect }: Props) {
  return (
    <nav aria-label="Course list" className="w-44 shrink-0">
      <div className="sticky top-0 pt-0.5">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Courses
        </p>
        <ul className="space-y-0.5" role="list">
          {courses.map((course) => {
            const active = course.id === selectedId
            return (
              <li key={course.id}>
                <button
                  type="button"
                  onClick={() => onSelect(course.id)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                    active
                      ? 'bg-accent/30 ring-1 ring-border'
                      : 'hover:bg-muted'
                  )}
                >
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: course.color }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn(
                      'block truncate text-[12px] font-medium leading-snug',
                      active ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {course.name}
                    </span>
                    <span className={cn('text-[11px] font-semibold tabular-nums', gradeColor(course.grade))}>
                      {course.grade.toFixed(1)}% · {course.letterGrade}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
