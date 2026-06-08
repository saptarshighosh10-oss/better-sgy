'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSchoolYears } from '@/lib/use-grades'
import { useConnection } from '@/lib/use-connection'
import { CourseCard } from './course-card'
import { AnalyticsStrip } from './analytics-strip'
import { MissingSection, type MissingItem } from './missing-section'
import { UpcomingSection } from './upcoming-section'
import { RecentUpdates } from './recent-updates'
import { SmartPriorities } from './smart-priorities'
import { StudyMusic } from './study-music'
import { useAppStore } from '@/store/use-app-store'
import { MASCOT_PRESETS } from '@/components/mascot/preset-mascots'
import type { SchoolYear } from '@/lib/types'
import type { ActivityItem } from '@/lib/scraper/scrape-activity'

const NOW = new Date()
const UPCOMING_END = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000)

function EmptyIcon({ kind }: { kind: 'spinner' | 'link' | 'layers' }) {
  if (kind === 'spinner') {
    return (
      <svg viewBox="0 0 20 20" width="22" height="22" fill="none" className="animate-spin text-muted-foreground" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
        <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'link') {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function EmptyState({ year }: { year: SchoolYear | undefined }) {
  const isPartial = year?.isPartial ?? false
  const hasNoData = !year?.hasData
  const connected = useConnection('schoology')

  const copy =
    connected === null
      ? {
          icon: 'spinner' as const,
          heading: 'Checking your connection…',
          body: 'One moment — checking whether Schoology is connected.',
          cta: false,
        }
      : connected === false
      ? {
          icon: 'link' as const,
          heading: 'Connect your Schoology account',
          body: 'Sign in once from Settings and your courses, grades, and assignments will start showing up here automatically.',
          cta: true,
        }
      : !year
      ? {
          icon: 'spinner' as const,
          heading: 'Getting your data ready',
          body: "You're connected — we're syncing your courses for the first time. This usually takes a minute or two.",
          cta: false,
        }
      : isPartial
      ? {
          icon: 'spinner' as const,
          heading: 'Still syncing',
          body: `${year.yearLabel}'s data is still coming in. Grades will appear here as they're collected.`,
          cta: false,
        }
      : hasNoData
      ? {
          icon: 'layers' as const,
          heading: 'No courses yet',
          body: `${year.yearLabel} doesn't have any course data yet. Once Schoology shows your classes, they'll appear here.`,
          cta: false,
        }
      : {
          icon: 'layers' as const,
          heading: 'Nothing to show',
          body: 'Pick a year and semester above to view grades.',
          cta: false,
        }

  return (
    <div className="px-6 py-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Course Dashboard
        </p>
        <h1 className="mt-1 text-lg font-semibold text-foreground">
          {year ? `${year.yearLabel} · ${year.gradeLevel}` : 'Welcome'}
        </h1>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
          <EmptyIcon kind={copy.icon} />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{copy.heading}</h2>
        <p className="mt-2 max-w-xs text-xs text-muted-foreground leading-relaxed">{copy.body}</p>
        {copy.cta && (
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Go to Settings to connect
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  )
}

export function OverviewClient() {
  const selectedYearId = useAppStore((s) => s.selectedYearId)
  const selectedSemesterId = useAppStore((s) => s.selectedSemesterId)
  const preset = useAppStore((s) => s.preset)
  const { schoolYears, analytics, loading } = useSchoolYears()

  // Schoology's home-page "OVERDUE" feed is the authoritative, unfiltered
  // source of overdue work — unlike the gradebook scrape, it also covers
  // courses (orientation/admin pseudo-courses, e.g. "Schoology Basics for
  // Students") that the gradebook view deliberately filters out, but whose
  // assignments can still be genuinely — sometimes "hella" — overdue.
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  useEffect(() => {
    fetch('/api/activity')
      .then((r) => r.json())
      .then((d) => setActivityItems(d.items ?? []))
      .catch(() => {})
  }, [])

  const year = schoolYears.find((y) => y.id === selectedYearId)
    ?? (schoolYears.length > 0 ? schoolYears[0] : undefined)
  const semester = year?.semesters.find((s) => s.id === selectedSemesterId)
    ?? year?.semesters[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" className="animate-spin text-muted-foreground" aria-hidden="true">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
          <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (!year || !year.hasData || !semester) {
    return <EmptyState year={year} />
  }

  const gradebookMissing: MissingItem[] = semester.courses.flatMap((course) =>
    course.categories.flatMap((cat) =>
      cat.assignments
        .filter((a) => a.status === 'missing' || a.status === 'late')
        .map((a) => ({
          id:          a.id,
          name:        a.name,
          status:      a.status,
          dueDate:     a.dueDate,
          courseName:  course.name,
          courseColor: course.color,
        }))
    )
  )

  // Add overdue items from courses the gradebook scrape doesn't carry at all
  // (matched by course name, case-insensitive) — without this, something like
  // a 289-days-overdue orientation task would silently never show up here.
  const knownCourseNames = new Set(semester.courses.map((c) => c.name.toLowerCase()))
  const extraMissing: MissingItem[] = activityItems
    .filter((item) =>
      item.type === 'missing' &&
      item.dueTimestamp != null &&
      !knownCourseNames.has(item.courseName.toLowerCase())
    )
    .map((item) => ({
      id:          item.id,
      name:        item.assignmentName,
      status:      'missing',
      dueDate:     new Date(item.dueTimestamp!).toISOString().split('T')[0],
      courseName:  item.courseName,
      courseColor: 'var(--color-muted)',
    }))

  // Most-overdue (oldest due date) first — that's the work that needs eyes most.
  const missingItems = [...gradebookMissing, ...extraMissing].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )

  const upcomingItems = semester.courses.flatMap((course) =>
    course.categories.flatMap((cat) =>
      cat.assignments
        .filter((a) => {
          const due = new Date(a.dueDate)
          return (
            due >= NOW &&
            due <= UPCOMING_END &&
            a.score === null &&
            a.status !== 'missing' &&
            a.status !== 'late'
          )
        })
        .map((assignment) => ({ assignment, course }))
    )
  ).sort(
    (a, b) =>
      new Date(a.assignment.dueDate).getTime() -
      new Date(b.assignment.dueDate).getTime()
  )

  const missingCount = missingItems.filter((i) => i.status === 'missing').length
  const lateCount    = missingItems.filter((i) => i.status === 'late').length

  // Keep the "Alerts" stat in AnalyticsStrip in sync with the merged count
  // above — the gradebook-only number it ships with would otherwise quietly
  // disagree with the fuller "To Do" list right next to it.
  const adjustedAnalytics = analytics ? { ...analytics, missingCount, lateCount } : analytics

  const isFullYear = year.id === 'yr-2025-2026' && !year.isPartial

  // How far through this semester we are (0–1), clamped
  const semStart = new Date(semester.startDate).getTime()
  const semEnd   = new Date(semester.endDate).getTime()
  const semesterProgress = Math.min(1, Math.max(0, (NOW.getTime() - semStart) / (semEnd - semStart)))

  return (
    <div className="w-full px-5 py-5">
      {/* Page header — school portal style */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Course Dashboard
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <h1 className="text-base font-semibold text-foreground">
            {year.yearLabel} · {year.gradeLevel}
          </h1>
          <span className="text-xs text-muted-foreground">{semester.label}</span>
          {year.isPartial && (
            <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
              Partial
            </span>
          )}
        </div>
      </div>

      {/* Compact grade summary bar */}
      {isFullYear && adjustedAnalytics && (
        <div className="mb-4" style={{ animation: 'card-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          <AnalyticsStrip analytics={adjustedAnalytics} />
        </div>
      )}

      {/* Two-column layout: course grid + right panel */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_520px]">

        {/* ── Left: Course grade grid ────────────────────────── */}
        <section aria-label="Course grades">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Grade Summary
            </h2>
            <span className="text-[10px] text-muted-foreground">
              {semester.courses.length} courses · {semester.label}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {semester.courses.map((course, i) => (
              <div
                key={course.id}
                style={{
                  animation: 'card-slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                  animationDelay: `${i * 55}ms`,
                }}
              >
                <CourseCard course={course} semesterProgress={semesterProgress} />
              </div>
            ))}
          </div>

          {/* Semester summary — compact stat row */}
          <div className="mt-4 flex items-stretch divide-x divide-border rounded-xl border border-border bg-card overflow-hidden">
            {[
              { value: 'Jan – May 2026', label: semester.label },
              { value: String(semester.courses.length), label: 'courses' },
              { value: `${analytics?.averageGrade ?? '--'}`, label: 'avg grade' },
              { value: String(missingCount), label: 'missing' },
              { value: String(lateCount), label: 'late' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col justify-center px-4 py-2.5 min-w-0">
                <span className="text-sm font-semibold text-foreground tabular-nums leading-tight">
                  {value}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <SmartPriorities courses={semester.courses} />

        </section>

        {/* ── Right panel ─────────────────────────────────────── */}
        <aside className="flex flex-col gap-4" aria-label="Sidebar panels">

          {/* Top banner — preset-aware */}
          {preset === 'butcher' ? (
            <div
              className="overflow-hidden rounded-xl border border-border bg-black"
              style={{ animation: 'panel-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              <img
                src="/mascot/butcher-couch.png"
                alt=""
                aria-hidden="true"
                className="w-full"
                style={{ display: 'block', maxHeight: 200, objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
          ) : MASCOT_PRESETS[preset] ? (
            <div
              className="flex items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent px-4 py-3"
              style={{ animation: 'panel-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              {(() => {
                const { Sprite, bannerTitle, bannerSubtitle } = MASCOT_PRESETS[preset]!
                return (
                  <>
                    <div
                      className="shrink-0"
                      style={{ animation: 'mascot-spring-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) both 0.1s' }}
                    >
                      <Sprite width={56} height={60} />
                    </div>
                    <div style={{ animation: 'chip-bubble-in 0.4s ease-out both 0.3s' }}>
                      <p className="text-sm font-semibold text-foreground">{bannerTitle}</p>
                      <p className="text-[11px] text-muted-foreground">{bannerSubtitle}</p>
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div
              className="flex items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent px-4 py-3"
              style={{ animation: 'panel-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Good to go.</p>
                <p className="text-[11px] text-muted-foreground">Grades are synced and up to date.</p>
              </div>
            </div>
          )}

          {/* Study Music — full width */}
          <div style={{ animation: 'panel-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.1s' }}>
            <StudyMusic />
          </div>

          {/* Missing */}
          <div style={{ animation: 'panel-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.2s' }}>
            <MissingSection items={missingItems} />
          </div>

          {/* Upcoming — flex-1 so it fills whatever space remains */}
          <div
            className="flex flex-1 flex-col"
            style={{ animation: 'panel-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both 0.25s' }}
          >
            <UpcomingSection items={upcomingItems} fill />
          </div>
        </aside>
      </div>

    </div>
  )
}
