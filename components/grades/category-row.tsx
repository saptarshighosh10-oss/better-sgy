'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/shared/status-chip'
import type { Category } from '@/lib/types'

function categoryAverage(cat: Category): number | null {
  const scored = cat.assignments.filter((a) => a.score !== null && a.pointsPossible > 0)
  if (scored.length === 0) return null
  const pts = scored.reduce((acc, a) => acc + a.score!, 0)
  const max = scored.reduce((acc, a) => acc + a.pointsPossible, 0)
  return max > 0 ? (pts / max) * 100 : null
}

function pctColor(pct: number) {
  if (pct >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 90) return 'text-green-600 dark:text-green-400'
  if (pct >= 80) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

type Props = { category: Category }

export function CategoryRow({ category }: Props) {
  const [open, setOpen] = useState(true)
  const avg = categoryAverage(category)

  return (
    <div className="border-b border-border last:border-b-0">
      {/* ── Category header ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <svg
          viewBox="0 0 24 24"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={cn('shrink-0 text-muted-foreground transition-transform duration-150', open && 'rotate-90')}
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>

        <span className="flex-1 text-left text-[12px] font-semibold text-foreground">
          {category.name}
        </span>

        <span className="text-[11px] text-muted-foreground/70">
          {category.weight}% of grade
        </span>

        <span className={cn(
          'w-16 text-right text-[12px] font-semibold tabular-nums',
          avg !== null ? pctColor(avg) : 'text-muted-foreground/40'
        )}>
          {avg !== null ? `${avg.toFixed(1)}%` : '—'}
        </span>
      </button>

      {/* ── Assignment rows ──────────────────────────────── */}
      {open && (
        <div>
          {/* Column header */}
          <div className="grid grid-cols-[1fr_88px_90px_68px_80px] gap-2 border-t border-border/50 bg-muted/25 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <span>Assignment</span>
            <span>Due</span>
            <span className="text-right">Score</span>
            <span className="text-right">Percent</span>
            <span>Status</span>
          </div>

          {category.assignments.map((a) => {
            const isUnscored = a.score === null && a.status !== 'missing' && a.status !== 'late'
            const isMissing = a.status === 'missing' || a.status === 'late'

            return (
              <div
                key={a.id}
                className={cn(
                  'grid grid-cols-[1fr_88px_90px_68px_80px] gap-2 border-t border-border/40 px-4 py-2 text-xs transition-colors hover:bg-muted/20',
                  isUnscored && 'opacity-55',
                )}
              >
                <span className={cn(
                  'truncate font-medium',
                  isMissing ? 'text-destructive' : 'text-card-foreground'
                )}>
                  {a.name}
                </span>

                <span className="text-muted-foreground tabular-nums">
                  {a.dueDate
                    ? new Date(a.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—'}
                </span>

                <span className="text-right tabular-nums text-muted-foreground">
                  {a.score !== null
                    ? `${a.score} / ${a.pointsPossible}`
                    : `— / ${a.pointsPossible}`}
                </span>

                <span className={cn(
                  'text-right tabular-nums font-medium',
                  a.percent !== null ? pctColor(a.percent) : 'text-muted-foreground/40'
                )}>
                  {a.percent !== null ? `${a.percent.toFixed(1)}%` : '—'}
                </span>

                <span>
                  {a.status !== 'normal' ? (
                    <StatusChip status={a.status} />
                  ) : a.score !== null ? (
                    <span className="text-[10px] text-muted-foreground/50">Graded</span>
                  ) : (
                    <span className="text-[10px] text-primary/60">Upcoming</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
