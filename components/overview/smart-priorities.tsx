'use client'

import { useState, useMemo } from 'react'
import type { Course } from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────

type Priority = {
  id:             string
  assignmentName: string
  courseName:     string
  categoryName:   string
  categoryWeight: number
  pointsPossible: number
  status:         string
  dueDate:        string
  impact:         number
  deltaAt:        (pct: number) => number
}

// ── Calculation ────────────────────────────────────────────────────────────

function buildPriorities(courses: Course[]): Priority[] {
  const result: Priority[] = []

  for (const course of courses) {
    for (const cat of course.categories) {
      if (!cat.weight) continue

      const allPts = cat.assignments.reduce((s, a) => s + a.pointsPossible, 0)
      if (allPts === 0) continue

      const scored      = cat.assignments.filter((a) => a.score !== null)
      const scoredPts   = scored.reduce((s, a) => s + a.pointsPossible, 0)
      const scoredScore = scored.reduce((s, a) => s + a.score!, 0)
      const catAvg      = scoredPts > 0 ? scoredScore / scoredPts : null

      for (const a of cat.assignments) {
        if (a.status !== 'missing' && a.status !== 'late') continue

        const impact  = (a.pointsPossible / allPts) * cat.weight
        const deltaAt = (pct: number) => {
          const wtInCat = a.pointsPossible / allPts
          return (pct / 100 - (catAvg ?? 0)) * wtInCat * cat.weight
        }

        result.push({
          id:             a.id,
          assignmentName: a.name,
          courseName:     course.name,
          categoryName:   cat.name,
          categoryWeight: cat.weight,
          pointsPossible: a.pointsPossible,
          status:         a.status,
          dueDate:        a.dueDate,
          impact,
          deltaAt,
        })
      }
    }
  }

  return result.sort((a, b) => b.impact - a.impact)
}

const SCORES = [70, 80, 90, 100] as const
type ScoreOpt = typeof SCORES[number]

// ── Component ──────────────────────────────────────────────────────────────

export function SmartPriorities({ courses }: { courses: Course[] }) {
  const [assumed, setAssumed] = useState<ScoreOpt>(80)

  const items     = useMemo(() => buildPriorities(courses), [courses])
  const maxImpact = items[0]?.impact ?? 1

  if (items.length === 0) return null

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">Smart Priorities</span>
          <span className="text-[10px] text-muted-foreground/60">ranked by grade weight</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/60">if submitted at</span>
          <div className="flex">
            {SCORES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setAssumed(s)}
                className={[
                  'px-2.5 py-1 text-[10px] font-medium transition-colors border-b-2',
                  assumed === s
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      <ul role="list">
        {items.slice(0, 8).map((item, i) => {
          const delta   = item.deltaAt(assumed)
          const barW    = Math.round((item.impact / maxImpact) * 100)
          const dateStr = item.dueDate
            ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : null
          const sign = delta >= 0 ? '+' : ''

          return (
            <li key={item.id} className="group border-b border-border/50 last:border-0">
              <div className="flex items-center gap-4 px-4 py-3">

                {/* Rank */}
                <span className="w-3 shrink-0 text-[10px] tabular-nums text-muted-foreground/30">
                  {i + 1}
                </span>

                {/* Text block */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-xs font-medium text-foreground">
                      {item.assignmentName}
                    </p>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                      {sign}{delta.toFixed(2)}%
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                    <span>{item.courseName}</span>
                    <span>·</span>
                    <span>{item.categoryName}</span>
                    <span>·</span>
                    <span>{item.pointsPossible} pts</span>
                    {dateStr && <><span>·</span><span>due {dateStr}</span></>}
                    <span className="ml-1 rounded border border-border px-1 py-px text-[9px] uppercase tracking-wide text-muted-foreground/50">
                      {item.status}
                    </span>
                  </div>

                  {/* Weight bar — white/muted only */}
                  <div className="mt-2 h-px w-full bg-border/60">
                    <div
                      className="h-px bg-foreground/25 transition-[width] duration-300"
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                </div>

              </div>
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <div className="border-t border-border/50 px-4 py-2">
        <p className="text-[10px] text-muted-foreground/40">
          {assumed < 90
            ? `At ${assumed}%, scores below your category average pull grades down — still better than a zero.`
            : 'Priority order is by category weight, not due date.'}
        </p>
      </div>
    </div>
  )
}
