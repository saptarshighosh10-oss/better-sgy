'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Course } from '@/lib/types'
import { StatusChip } from '@/components/shared/status-chip'
import { useAppStore } from '@/store/use-app-store'

function getBandLabel(course: Course): string {
  const n = course.name.toLowerCase()
  const num = course.name.match(/\d+/)?.[0] ?? ''
  if (/algebra|trig/.test(n)) return num ? `ALG ${num}` : 'ALG'
  if (/biology/.test(n))      return 'BIO'
  if (/lit|writ|english/.test(n)) return 'LIT'
  if (/french/.test(n))       return num ? `FR ${num}` : 'FR'
  if (/^pe\b|physical/.test(n)) return num ? `PE ${num}` : 'PE'
  if (/drama|theatre/.test(n)) return 'DRAMA'
  // Generic: first word, max 5 chars
  return course.name.split(/[\s/]/)[0].slice(0, 5).toUpperCase()
}

// Scale down the watermark proportionally so longer abbreviations still fill the space
function bandFontSize(abbr: string): string {
  const n = abbr.replace(/\s/g, '').length
  if (n <= 2) return 'text-[64px]'
  if (n === 3) return 'text-[50px]'
  if (n === 4) return 'text-[40px]'
  return 'text-[32px]'
}

function Sparkline({
  data,
  color,
  progress,
  width = 120,
  height = 28,
}: {
  data: number[]
  color: string
  progress?: number   // 0–1: how far through the semester we are
  width?: number
  height?: number
}) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const cx = (i: number) => (i / (data.length - 1)) * width
  const cy = (v: number) => height - ((v - min) / range) * (height - 4) - 2

  const pts = data.map((v, i) => `${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join(' ')
  const lastX = cx(data.length - 1)
  const lastY = cy(data[data.length - 1])

  // "now" marker x position
  const nowX = progress != null ? progress * width : null

  return (
    <svg
      width={width}
      height={height + 12}
      viewBox={`0 0 ${width} ${height + 12}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      {/* "Now" vertical marker */}
      {nowX != null && (
        <g>
          <line
            x1={nowX} y1={0}
            x2={nowX} y2={height}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
            className="text-foreground/25"
          />
          <text
            x={nowX}
            y={height + 10}
            textAnchor="middle"
            fontSize="7.5"
            className="fill-muted-foreground/50"
          >
            now
          </text>
        </g>
      )}

      {/* Sparkline — currentColor guarantees contrast on any theme bg; course color on endpoint dot */}
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground/50"
      />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  )
}

function gradeTextColor(grade: number) {
  if (grade >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (grade >= 90) return 'text-green-600 dark:text-green-400'
  if (grade >= 87) return 'text-lime-700 dark:text-lime-400'
  if (grade >= 83) return 'text-amber-600 dark:text-amber-400'
  if (grade >= 80) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

type Props = {
  course: Course
  semesterProgress?: number
}

export function CourseCard({ course, semesterProgress }: Props) {
  const allAssignments = course.categories.flatMap((c) => c.assignments)
  const missing = allAssignments.filter((a) => a.status === 'missing')
  const late = allAssignments.filter((a) => a.status === 'late')
  const hasAlert = missing.length > 0 || late.length > 0

  const abbr = getBandLabel(course)

  const reducedMotion = useAppStore((s) => s.reducedMotion)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [tilting, setTilting] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    if (reducedMotion) return
    const rect = linkRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    setTilt({ rx: (0.5 - py) * 8, ry: (px - 0.5) * 10 })
    setTilting(true)
  }

  function handleMouseLeave() {
    setTilt({ rx: 0, ry: 0 })
    setTilting(false)
  }

  return (
    <Link
      ref={linkRef}
      href={`/gradegraph?course=${course.id}`}
      className="group card-press block overflow-hidden rounded-xl bg-card ring-1 ring-foreground/8 transition-shadow duration-300 hover:shadow-lg hover:ring-primary/30"
      aria-label={`View ${course.name} in GradeGraph`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '900px' }}
    >
      <article
        style={
          reducedMotion
            ? undefined
            : {
                transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                transition: tilting
                  ? 'transform 120ms ease-out'
                  : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
                willChange: 'transform',
              }
        }
      >
      {/* Subject band — flat solid color, no gradient */}
      <div
        className="relative h-20 overflow-hidden"
        style={{ backgroundColor: course.color }}
      >
        {/* Abbreviation watermark — course identity, subtle texture */}
        <span
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center font-black leading-none tracking-tight text-[var(--band-watermark)] select-none',
            bandFontSize(abbr)
          )}
          aria-hidden="true"
        >
          {abbr}
        </span>

        {/* Period — bottom left, strong and school-card-like */}
        <span className="absolute bottom-2.5 left-3 text-sm font-bold text-[var(--band-fg)] leading-none select-none">
          P{course.period}
        </span>
      </div>

      {/* Card body */}
      <div className="px-4 pb-4 pt-3">
        {/* Course name + grade */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-card-foreground">
              {course.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {course.teacher}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn('text-xl font-bold tabular-nums leading-tight', gradeTextColor(course.grade))}>
              {course.grade.toFixed(1)}
              <span className="text-sm">%</span>
            </p>
            <p className="text-xs font-medium text-muted-foreground">{course.letterGrade}</p>
          </div>
        </div>

        {/* Sparkline + chips */}
        <div className="mt-3 flex items-end justify-between gap-2">
          <Sparkline data={course.trendData} color={course.color} progress={semesterProgress} />
          {hasAlert && (
            <div className="flex flex-wrap justify-end gap-1">
              {missing.map((_, i) => i === 0 && <StatusChip key="m" status="missing" />)}
              {late.map((_, i) => i === 0 && <StatusChip key="l" status="late" />)}
            </div>
          )}
        </div>

        {/* "View graph" hint — fades in on hover */}
        <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <span className="text-[10px] font-medium text-primary">View graph</span>
          <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="text-primary">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
      </article>
    </Link>
  )
}
