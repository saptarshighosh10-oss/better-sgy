import { cn } from '@/lib/utils'
import type { AnalyticsSummary } from '@/lib/types'

type Props = {
  analytics: AnalyticsSummary
}

export function AnalyticsStrip({ analytics }: Props) {
  const total = analytics.missingCount + analytics.lateCount

  const stats = [
    {
      label: 'Avg Grade',
      value: `${analytics.averageGrade}%`,
      note: 'All courses this semester',
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Alerts',
      value: total === 0 ? 'None' : String(total),
      note: total === 0 ? 'All caught up' : `${analytics.missingCount} missing · ${analytics.lateCount} late`,
      accent: total === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
    },
    {
      label: 'Best Class',
      value: analytics.bestClass,
      note: '96.5% average',
      accent: 'text-foreground',
    },
    {
      label: 'Hardest Class',
      value: analytics.hardestClass,
      note: 'Lowest average',
      accent: 'text-foreground',
    },
  ]

  return (
    <div
      className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4 sm:divide-y-0"
      role="region"
      aria-label="Grade summary"
    >
      {stats.map((s) => (
        <div key={s.label} className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {s.label}
          </p>
          <p className={cn('mt-1 text-lg font-bold leading-tight truncate', s.accent)}>
            {s.value}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{s.note}</p>
        </div>
      ))}
    </div>
  )
}
