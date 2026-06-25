'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useSchoolYears } from '@/lib/use-grades'
import { CourseSidebar } from './course-sidebar'
import { Gradebook } from './gradebook'

const GRADE_ICONS: Record<string, string> = {
  Freshman:  '9',
  Sophomore: '10',
  Junior:    '11',
  Senior:    '12',
}

export function GradesClient() {
  const { schoolYears, loading } = useSchoolYears()
  const [selectedYearId, setSelectedYearId]       = useState('yr-2025-2026')
  const [selectedSemesterId, setSelectedSemesterId] = useState('sem-2025-2026-s2')
  const [selectedCourseId, setSelectedCourseId]   = useState('')

  const year     = schoolYears.find((y) => y.id === selectedYearId) ?? schoolYears[0]
  const semester = year?.semesters.find((s) => s.id === selectedSemesterId) ?? year?.semesters[0]
  const course   = semester?.courses.find((c) => c.id === selectedCourseId) ?? semester?.courses[0]

  function selectYear(yearId: string) {
    const yr = schoolYears.find((y) => y.id === yearId)
    const firstSem = yr?.semesters[0]
    setSelectedYearId(yearId)
    setSelectedSemesterId(firstSem?.id ?? '')
    setSelectedCourseId(firstSem?.courses[0]?.id ?? '')
  }

  function selectSemester(semId: string) {
    const sem = year?.semesters.find((s) => s.id === semId)
    setSelectedSemesterId(semId)
    setSelectedCourseId(sem?.courses[0]?.id ?? '')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" className="animate-spin text-muted-foreground" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
        <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )

  return (
    <div className="w-full px-5 py-5">
      {/* Page header */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Gradebook
        </p>
        <h1 className="mt-0.5 text-base font-semibold text-foreground">
          All Years — High School
        </h1>
      </div>

      {/* ── Year tabs ──────────────────────────────────────── */}
      <div className="mb-0 flex items-end border-b border-border">
        {schoolYears.map((yr) => {
          const active   = yr.id === selectedYearId
          const hasData  = yr.hasData
          const grade    = GRADE_ICONS[yr.gradeLevel] ?? '?'

          return (
            <button
              key={yr.id}
              type="button"
              onClick={() => selectYear(yr.id)}
              className={cn(
                'group relative flex flex-col items-start px-4 pb-2.5 pt-2.5 text-left transition-colors',
                'border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-primary'
                  : 'border-transparent hover:border-border',
                !hasData && 'opacity-40 cursor-default'
              )}
              disabled={!hasData && !active}
              aria-current={active ? 'page' : undefined}
            >
              <span className="flex items-center gap-1.5">
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {grade}
                </span>
                <span className={cn(
                  'text-[13px] font-semibold',
                  active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  {yr.gradeLevel}
                </span>
                {yr.isPartial && (
                  <span className="rounded border border-warning/40 bg-warning/10 px-1 py-0.5 text-[9px] font-semibold text-warning-foreground">
                    Partial
                  </span>
                )}
              </span>
              <span className={cn(
                'mt-0.5 text-[10px]',
                active ? 'text-muted-foreground' : 'text-muted-foreground/60'
              )}>
                {yr.yearLabel}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── No data state ──────────────────────────────────── */}
      {!year?.hasData && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {year?.gradeLevel} year hasn't started yet
          </p>
          <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
            Grades for {year?.yearLabel} will appear here once the year begins and data is synced.
          </p>
        </div>
      )}

      {/* ── Semester tabs (when year has multiple semesters) ─ */}
      {year?.hasData && year.semesters.length > 1 && (
        <div className="mt-3 mb-4 flex gap-1">
          {year.semesters.map((sem) => (
            <button
              key={sem.id}
              type="button"
              onClick={() => selectSemester(sem.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
                selectedSemesterId === sem.id
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {sem.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Partial / no-semester state ────────────────────── */}
      {year?.hasData && !semester && (
        <div className="mt-6 flex items-center justify-center rounded-xl border border-border bg-card py-12">
          <p className="text-sm text-muted-foreground">No semester data available for this year.</p>
        </div>
      )}

      {/* ── Gradebook ──────────────────────────────────────── */}
      {year?.hasData && semester && (
        <div className={cn('flex items-start gap-6', year.semesters.length <= 1 ? 'mt-4' : '')}>
          {semester.courses.length > 0 && course ? (
            <>
              <CourseSidebar
                courses={semester.courses}
                selectedId={course.id}
                onSelect={setSelectedCourseId}
              />
              <Gradebook
                course={course}
                semesterLabel={`${year.gradeLevel} · ${semester.label}`}
                isPartial={year.isPartial}
              />
            </>
          ) : (
            <div className="flex w-full items-center justify-center rounded-xl border border-border bg-card py-12">
              <p className="text-sm text-muted-foreground">
                {year.isPartial
                  ? 'Course data is still being collected for this semester.'
                  : 'No courses found for this semester.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
