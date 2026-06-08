'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ActivityItem } from '@/lib/scraper/scrape-activity'

const TYPE_META: Record<ActivityItem['type'], { label: string; dotClass: string; textClass: string }> = {
  graded:    { label: 'Graded',    dotClass: 'bg-emerald-500',      textClass: 'text-emerald-600 dark:text-emerald-400' },
  submitted: { label: 'Submitted', dotClass: 'bg-primary',          textClass: 'text-primary' },
  missing:   { label: 'Missing',   dotClass: 'bg-destructive',      textClass: 'text-destructive' },
  late:      { label: 'Late',      dotClass: 'bg-amber-500',        textClass: 'text-amber-600 dark:text-amber-400' },
  upcoming:  { label: 'Upcoming',  dotClass: 'bg-muted-foreground', textClass: 'text-muted-foreground' },
}

function relativeDate(isoOrMs: string | number): string {
  const date    = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs)
  const diffMs  = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs  = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 2)   return 'Just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  if (diffHrs  < 24)  return `${diffHrs}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays  < 7)  return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentUpdates() {
  const [items, setItems]         = useState<ActivityItem[]>([])
  const [scrapedAt, setScrapedAt] = useState<number | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch('/api/activity')
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? [])
        setScrapedAt(d.scrapedAt ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Missing/late live in the To Do panel — don't duplicate here
  const feedItems = items.filter((item) => item.type !== 'missing' && item.type !== 'late')

  return (
    <section aria-label="Recently updated">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recently Updated
        </h2>
        {scrapedAt && (
          <span className="text-[10px] text-muted-foreground/50">
            {relativeDate(scrapedAt)}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-xs font-medium text-muted-foreground">No recent activity</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Run a Schoology refresh in Settings to pull updates from the home feed.
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {feedItems.slice(0, 12).map((item) => {
              const { label, dotClass, textClass } = TYPE_META[item.type] ?? TYPE_META.upcoming
              return (
                <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                  <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug text-card-foreground line-clamp-2">
                      {item.assignmentName}
                    </p>
                    {item.courseName && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {item.courseName}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {item.dueDate && (
                      <p className="text-[10px] text-muted-foreground">{item.dueDate}</p>
                    )}
                    <p className={cn('mt-0.5 text-[10px] font-semibold', textClass)}>{label}</p>
                    {item.score && (
                      <p className="text-[10px] font-semibold text-foreground tabular-nums">{item.score}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
