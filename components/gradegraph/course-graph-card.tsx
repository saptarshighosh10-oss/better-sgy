import { cn } from '@/lib/utils'
import type { Course } from '@/lib/types'

function gradeColor(g: number) {
  if (g >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (g >= 90) return 'text-green-600 dark:text-green-400'
  if (g >= 87) return 'text-lime-700 dark:text-lime-400'
  if (g >= 83) return 'text-amber-600 dark:text-amber-400'
  if (g >= 80) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

function scoreColor(pct: number) {
  if (pct >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 87) return 'text-green-600 dark:text-green-400'
  if (pct >= 80) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null

  // Padded Y range: round to nearest 5, add ±4 buffer, clamp 50–100
  const rawMin = Math.min(...data)
  const rawMax = Math.max(...data)
  const yMin = Math.max(50, Math.floor((rawMin - 4) / 5) * 5)
  const yMax = Math.min(100, Math.ceil((rawMax + 4) / 5) * 5)
  const range = yMax - yMin || 1

  const w = 200, h = 46
  const padL = 2, padR = 2, padT = 4, padB = 4
  const pw = w - padL - padR, ph = h - padT - padB

  const cx = (i: number) => padL + (i / (data.length - 1)) * pw
  const cy = (v: number) => padT + (1 - (v - yMin) / range) * ph

  const pts = data.map((v, i) => `${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join(' ')
  const lastX = cx(data.length - 1)
  const lastY = cy(data[data.length - 1])

  // Area fill
  const area = [
    `M ${cx(0).toFixed(1)},${(padT + ph).toFixed(1)}`,
    ...data.map((v, i) => `L ${cx(i).toFixed(1)},${cy(v).toFixed(1)}`),
    `L ${lastX.toFixed(1)},${(padT + ph).toFixed(1)} Z`,
  ].join(' ')

  // Subtle grid lines at the yMin and yMax
  const gridLines = [yMin, yMax]

  const delta = data[data.length - 1] - data[0]

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="overflow-visible">
      {gridLines.map(v => (
        <line key={v}
          x1={padL} y1={cy(v)} x2={padL + pw} y2={cy(v)}
          stroke={color} strokeWidth="0.5" opacity="0.15"
          strokeDasharray="3 4"
        />
      ))}
      <path d={area} fill={color} opacity="0.07" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
      {/* Y-axis labels */}
      <text x={padL - 1} y={cy(yMin)} textAnchor="end" dominantBaseline="middle"
        fontSize="7.5" fill={color} opacity="0.5">{yMin}</text>
      <text x={padL - 1} y={cy(yMax)} textAnchor="end" dominantBaseline="middle"
        fontSize="7.5" fill={color} opacity="0.5">{yMax}</text>
    </svg>
  )
}

type Props = {
  course: Course
  onClick: () => void
  exiting: boolean
}

export function CourseGraphCard({ course, onClick, exiting }: Props) {
  const missingCount = course.categories.reduce(
    (n, cat) => n + cat.assignments.filter(a => a.status === 'missing' || a.status === 'late').length,
    0
  )

  const delta = course.trendData.length >= 2
    ? course.trendData[course.trendData.length - 1] - course.trendData[0]
    : 0
  const deltaLabel = delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`
  const deltaColor = delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'

  // 5 most recently graded assignments by dueDate desc
  const recentGrades = course.categories
    .flatMap(cat => cat.assignments.filter(a => a.score !== null && a.percent !== null))
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, 5)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={exiting ? { animation: 'grid-card-out 0.2s ease-in both', pointerEvents: 'none' } : {}}
      aria-label={`View ${course.name} graph`}
    >
      {/* Color band */}
      <div className="relative h-12 overflow-hidden" style={{ backgroundColor: course.color }}>
        <span className="absolute bottom-1.5 left-3 text-[11px] font-bold text-[var(--band-fg)] leading-none select-none">
          P{course.period}
        </span>
        {missingCount > 0 && (
          <span 
            className="absolute right-2.5 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{ backgroundColor: 'var(--band-fg)', color: course.color }}
          >
            {missingCount} issue{missingCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="absolute right-2.5 bottom-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--band-fg)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </span>
      </div>

      {/* Header: name + grade */}
      <div className="flex items-start justify-between gap-2 px-3.5 pt-2.5 pb-1.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-card-foreground">
            {course.name}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{course.teacher}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-xl font-bold tabular-nums leading-tight', gradeColor(course.grade))}>
            {course.grade.toFixed(1)}<span className="text-sm">%</span>
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground leading-none">{course.letterGrade}</p>
          <p className={cn('text-[10px] font-semibold tabular-nums mt-0.5', deltaColor)}>
            {deltaLabel}
          </p>
        </div>
      </div>

      {/* Sparkline — full width */}
      <div className="px-3">
        <Sparkline data={course.trendData} color={course.color} />
      </div>

      {/* Recent grades */}
      {recentGrades.length > 0 && (
        <div className="mt-1 border-t border-border/50 px-3.5 pb-3 pt-2">
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Recent
          </p>
          <div className="space-y-1">
            {recentGrades.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-muted-foreground">{a.name}</span>
                <span className={cn('shrink-0 text-[11px] font-semibold tabular-nums', scoreColor(a.percent!))}>
                  {a.percent!.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  )
}
