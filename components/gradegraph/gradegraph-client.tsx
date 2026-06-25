'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSchoolYears } from '@/lib/use-grades'
import { ChipZone } from '@/components/overview/chip-zone'
import { CourseGraphCard } from './course-graph-card'
import { CourseDetail } from './course-detail'
import type { Course, Semester, SchoolYear } from '@/lib/types'

const NOW = new Date()

function useDelayedReady(ms = 180) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms)
    return () => clearTimeout(t)
  }, [])
  return ready
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true" className="animate-spin">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" className="text-border" />
          <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary" />
        </svg>
        <span className="text-[12px] text-muted-foreground">Loading grades…</span>
      </div>
    </div>
  )
}

// ── Course grid with zoom ─────────────────────────────────────────────────────
function SemesterGrid({
  courses,
  semesterLabel,
  initialCourseId,
}: {
  courses: Course[]
  semesterLabel: string
  initialCourseId?: string
}) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(() => {
    if (!initialCourseId) return null
    return courses.find(c => c.id === initialCourseId) ?? null
  })
  const [exitingId, setExitingId] = useState<string | null>(null)

  function handleCardClick(course: Course) {
    setExitingId(course.id)
    setTimeout(() => { setExitingId(null); setSelectedCourse(course) }, 200)
  }

  if (selectedCourse) {
    const courseIndex = courses.findIndex(c => c.id === selectedCourse.id)
    return (
      <CourseDetail
        key={selectedCourse.id}
        course={selectedCourse}
        semesterLabel={semesterLabel}
        onBack={() => setSelectedCourse(null)}
        courses={courses}
        courseIndex={courseIndex}
        onCourseChange={(c) => setSelectedCourse(c)}
      />
    )
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}
    >
      {courses.map(course => (
        <CourseGraphCard
          key={course.id}
          course={course}
          onClick={() => handleCardClick(course)}
          exiting={exitingId === course.id}
        />
      ))}
    </div>
  )
}

// ── Semester accordion ────────────────────────────────────────────────────────
function SemesterAccordion({
  sem,
  yearLabel,
  defaultOpen = false,
  isPartial = false,
  initialCourseId,
}: {
  sem: Semester
  yearLabel: string
  defaultOpen?: boolean
  isPartial?: boolean
  initialCourseId?: string
}) {
  const hasCourseMatch = initialCourseId ? sem.courses.some(c => c.id === initialCourseId) : false
  const [open, setOpen] = useState(defaultOpen || hasCourseMatch)
  const isUpcoming = new Date(sem.startDate) > NOW
  const avgGrade = sem.courses.length
    ? sem.courses.reduce((s, c) => s + c.grade, 0) / sem.courses.length
    : null
  const startDate = new Date(sem.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header row */}
      <button
        type="button"
        onClick={() => !isUpcoming && setOpen(v => !v)}
        disabled={isUpcoming}
        className={cn(
          'flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors',
          isUpcoming ? 'cursor-default opacity-50' : 'hover:bg-muted/40'
        )}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
            S{sem.label.includes('1') ? '1' : '2'}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-tight">
              {sem.label} · {yearLabel}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isUpcoming ? `Starts ${startDate}` : `${sem.courses.length} courses`}
              {isPartial && !isUpcoming && ' · Partial'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {avgGrade !== null && !isUpcoming && (
            <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">
              {avgGrade.toFixed(2)}% avg
            </span>
          )}
          {!isUpcoming && (
            <svg
              viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
              className={cn('text-muted-foreground transition-transform duration-200', open && 'rotate-90')}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </div>
      </button>

      {/* Expandable body */}
      {open && !isUpcoming && (
        <div
          className="border-t border-border px-4 py-4"
          style={{ animation: 'detail-in 0.22s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <SemesterGrid
            courses={sem.courses}
            semesterLabel={`${sem.label} · ${yearLabel}`}
            initialCourseId={initialCourseId}
          />
        </div>
      )}
    </div>
  )
}

// ── Placeholders ──────────────────────────────────────────────────────────────
function NoDataPlaceholder() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-5">
      <span className="text-xl font-bold text-muted-foreground/30 select-none">N/A</span>
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">No data yet</p>
        <p className="text-[11px] text-muted-foreground/60">Grades will appear here once this year begins.</p>
      </div>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-7">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40 select-none">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// ── Year block ────────────────────────────────────────────────────────────────
function YearBlock({
  year,
  isArchived,
  initialCourseId,
}: {
  year: SchoolYear
  isArchived: boolean
  initialCourseId?: string
}) {
  const s1 = year.semesters[0]
  const s2 = year.semesters[1]

  // Completed years: show S2 first (most recent), S1 as closed accordion below
  // Active/partial years: show S1 first (ongoing), S2 as closed accordion below
  const showS2First = isArchived && !!s2

  return (
    <div>
      {/* Year heading */}
      <div className="mb-4 flex items-center gap-2.5">
        <h2 className="text-[15px] font-semibold text-foreground">{year.gradeLevel}</h2>
        <span className="text-[12px] text-muted-foreground">{year.yearLabel}</span>
        {isArchived && (
          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Archived
          </span>
        )}
        {year.isPartial && !isArchived && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/8 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            In Progress
          </span>
        )}
      </div>

      {year.semesters.length === 0 ? (
        <NoDataPlaceholder />
      ) : showS2First ? (
        // Archived: S2 expanded on top, S1 accordion below
        <div className="space-y-3">
          {s2 && (
            <SemesterAccordion
              sem={s2}
              yearLabel={year.yearLabel}
              defaultOpen
              initialCourseId={initialCourseId}
            />
          )}
          {s1 && (
            <SemesterAccordion
              sem={s1}
              yearLabel={year.yearLabel}
              defaultOpen={false}
              initialCourseId={initialCourseId}
            />
          )}
        </div>
      ) : (
        // Active: S1 inline grid, S2 accordion below
        <div className="space-y-4">
          {s1 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-foreground">{s1.label}</h3>
                <span className="text-[11px] text-muted-foreground">{s1.courses.length} courses</span>
                {year.isPartial && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/8 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    Partial
                  </span>
                )}
              </div>
              <SemesterGrid
                courses={s1.courses}
                semesterLabel={`${s1.label} · ${year.yearLabel}`}
                initialCourseId={initialCourseId}
              />
            </div>
          )}
          {s2 && (
            <SemesterAccordion
              sem={s2}
              yearLabel={year.yearLabel}
              defaultOpen={false}
              initialCourseId={initialCourseId}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function GradeGraphClient() {
  const ready = useDelayedReady(180)
  const { schoolYears, analytics } = useSchoolYears()
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialCourseId = searchParams.get('course') ?? undefined

  useEffect(() => {
    if (initialCourseId) router.replace('/gradegraph', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeYears   = schoolYears.filter(y => y.isPartial || !y.hasData)
  const archivedYears = schoolYears.filter(y => y.hasData && !y.isPartial)

  return (
    <div className="w-full px-6 py-5">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">GradeGraph</p>
        <h1 className="mt-0.5 text-base font-semibold text-foreground">Grade Analytics</h1>
      </div>

      {!ready ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Active / upcoming years */}
          <div className="space-y-10">
            {activeYears.map((year, i) => (
              <div key={year.id}>
                {i > 0 && <div className="mb-10 h-px bg-border" />}
                <YearBlock year={year} isArchived={false} initialCourseId={initialCourseId} />
              </div>
            ))}
          </div>

          {/* Archived years */}
          {archivedYears.length > 0 && (
            <>
              <SectionDivider label="Archived" />
              <div className="space-y-10">
                {archivedYears.map((year, i) => (
                  <div key={year.id}>
                    {i > 0 && <div className="mb-10 h-px bg-border" />}
                    <YearBlock year={year} isArchived initialCourseId={initialCourseId} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Chip mascot */}
          <div className="mt-10">
            <ChipZone
              missingCount={analytics?.missingCount ?? 0}
              upcomingCount={0}
              avgGrade={analytics?.averageGrade ?? 0}
            />
          </div>

          <p className="mt-4 text-[10px] text-muted-foreground/40">
            Junior and Senior years will populate once those years begin.
          </p>
        </>
      )}
    </div>
  )
}
