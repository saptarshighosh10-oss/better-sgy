'use client'

import { useState, useRef, useId, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/shared/status-chip'
import type { Course } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradeColor(g: number) {
  if (g >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (g >= 90) return 'text-green-600 dark:text-green-400'
  if (g >= 87) return 'text-lime-700 dark:text-lime-400'
  if (g >= 83) return 'text-amber-600 dark:text-amber-400'
  if (g >= 80) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}
function pctBarColor(pct: number) {
  if (pct >= 93) return 'bg-emerald-500'
  if (pct >= 90) return 'bg-green-500'
  if (pct >= 87) return 'bg-lime-500'
  if (pct >= 83) return 'bg-amber-500'
  if (pct >= 80) return 'bg-orange-500'
  return 'bg-red-500'
}
function gradeLetterFrom(g: number) {
  if (g >= 97) return 'A+'
  if (g >= 93) return 'A'
  if (g >= 90) return 'A−'
  if (g >= 87) return 'B+'
  if (g >= 83) return 'B'
  if (g >= 80) return 'B−'
  if (g >= 77) return 'C+'
  if (g >= 73) return 'C'
  return 'D'
}

function deriveOverrides(rawInputs: Record<string, string>): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [id, raw] of Object.entries(rawInputs)) {
    if (raw === '') { out[id] = null; continue }
    const n = parseFloat(raw)
    if (!isNaN(n)) out[id] = Math.min(999, Math.max(0, n))
  }
  return out
}

// ── Grade calculator ──────────────────────────────────────────────────────────
type Hypo = { id: string; categoryId: string; name: string; score: number; pointsPossible: number }

function calcGrade(
  course: Course,
  overrides: Record<string, number | null>, // null = excluded from avg
  hypotheticals: Hypo[]
): number {
  let weightedSum = 0
  let totalWeight = 0
  for (const cat of course.categories) {
    const real = cat.assignments
      .filter(a => {
        if (a.id in overrides) return overrides[a.id] !== null
        return a.score !== null
      })
      .map(a => {
        const score = a.id in overrides ? overrides[a.id]! : a.score!
        return (score / a.pointsPossible) * 100
      })
    const hypos = hypotheticals
      .filter(h => h.categoryId === cat.id)
      .map(h => (h.score / h.pointsPossible) * 100)
    const all = [...real, ...hypos]
    if (!all.length) continue
    const avg = all.reduce((s, v) => s + v, 0) / all.length
    weightedSum += avg * cat.weight
    totalWeight += cat.weight
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

// ── Grade timeline ────────────────────────────────────────────────────────────
type TimelinePoint = {
  date: string
  origGrade: number
  whatIfGrade: number
  assignmentName: string
  assignmentId: string
  catName: string
}

function calcGradeAtDate(
  course: Course,
  cutoffDate: string,
  overrides: Record<string, number | null>
): number | null {
  let weightedSum = 0
  let totalWeight = 0
  for (const cat of course.categories) {
    const assignments = cat.assignments.filter(a => {
      if (a.dueDate > cutoffDate) return false
      if (a.id in overrides) return overrides[a.id] !== null
      return a.score !== null
    })
    if (!assignments.length) continue
    const pcts = assignments.map(a => {
      const score = a.id in overrides ? overrides[a.id]! : a.score!
      return (score / a.pointsPossible) * 100
    })
    const avg = pcts.reduce((s, v) => s + v, 0) / pcts.length
    weightedSum += avg * cat.weight
    totalWeight += cat.weight
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null
}

function buildGradeTimeline(
  course: Course,
  overrides: Record<string, number | null>
): TimelinePoint[] {
  const allAssignments = course.categories
    .flatMap(cat =>
      cat.assignments.filter(a => a.score !== null).map(a => ({ ...a, catName: cat.name }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  const points: TimelinePoint[] = []
  for (const a of allAssignments) {
    const origGrade = calcGradeAtDate(course, a.dueDate, {})
    const whatIfGrade = calcGradeAtDate(course, a.dueDate, overrides)
    if (origGrade === null) continue
    points.push({
      date: a.dueDate,
      origGrade,
      whatIfGrade: whatIfGrade ?? origGrade,
      assignmentName: a.name,
      assignmentId: a.id,
      catName: a.catName,
    })
  }
  return points
}

// Build an SVG path string, breaking on null (excluded) points
function buildPath(pts: Array<{ x: number; y: number | null }>) {
  let d = ''
  let penDown = false
  for (const pt of pts) {
    if (pt.y === null) { penDown = false; continue }
    const coord = `${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
    d += penDown ? ` L${coord}` : `M${coord}`
    penDown = true
  }
  return d
}

function GradeTimelineChart({
  course,
  courseColor,
  overrides,
}: {
  course: Course
  courseColor: string
  overrides: Record<string, number | null>
}) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState(0)
  const [tooltip, setTooltip] = useState<{ idx: number } | null>(null)

  const hasAnyOverride = Object.keys(overrides).length > 0
  const points = buildGradeTimeline(course, overrides)

  if (!points.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <svg viewBox="0 0 44 26" width="44" height="26" fill="none" aria-hidden="true">
          <polyline points="2,22 11,14 20,17 29,8 38,11"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-muted-foreground/20" />
          {([2,11,20,29,38] as number[]).map((ptx, idx) => (
            <circle key={ptx} cx={ptx} cy={([22,14,17,8,11])[idx]} r="2"
              fill="currentColor" className="text-muted-foreground/20" />
          ))}
        </svg>
        <p className="text-[12px] text-muted-foreground">No graded assignments yet.</p>
      </div>
    )
  }

  const windowSize = Math.max(4, Math.ceil(points.length / zoom))
  const maxOffset = Math.max(0, points.length - windowSize)
  const safeOffset = Math.min(offset, maxOffset)
  const visible = points.slice(safeOffset, safeOffset + windowSize)

  const VH = 180
  const L = 40, R = 16, T = 16, B = 36
  const PH = VH - T - B
  const pxPerPt = Math.max(48, 800 / Math.max(visible.length - 1, 1))
  const VW = L + R + pxPerPt * Math.max(visible.length - 1, 1)

  const allGrades = visible.flatMap(p => [p.origGrade, p.whatIfGrade])
  const rawMin = Math.min(...allGrades)
  const rawMax = Math.max(...allGrades)
  const yMin = Math.max(0, Math.floor((rawMin - 8) / 5) * 5)
  const yMax = Math.min(102, Math.ceil((rawMax + 5) / 5) * 5)
  const yRange = yMax - yMin || 1

  const cx = (i: number) => L + i * pxPerPt
  const cy = (v: number) => T + (1 - (v - yMin) / yRange) * PH

  const gridY: number[] = []
  for (let y = Math.ceil(yMin / 5) * 5; y <= yMax; y += 5) gridY.push(y)

  const origPath = buildPath(visible.map((p, i) => ({ x: cx(i), y: cy(p.origGrade) })))
  const whatIfPath = hasAnyOverride
    ? buildPath(visible.map((p, i) => ({ x: cx(i), y: cy(p.whatIfGrade) })))
    : null

  function zoomIn() { setZoom(z => Math.min(z * 2, 8)); setOffset(safeOffset) }
  function zoomOut() { setZoom(z => Math.max(z / 2, 1)); setOffset(0) }
  function pan(dir: -1 | 1) {
    setOffset(o => Math.min(maxOffset, Math.max(0, o + dir * Math.max(1, Math.floor(windowSize / 4)))))
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-muted-foreground/60">
            {zoom > 1 ? `Showing ${visible.length} of ${points.length}` : `${points.length} assignments`}
          </p>
          {hasAnyOverride && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
              <svg viewBox="0 0 8 8" width="6" height="6" aria-hidden="true">
                <line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1.5"/>
              </svg>
              what-if active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {zoom > 1 && (
            <>
              <button type="button" onClick={() => pan(-1)} disabled={safeOffset === 0}
                className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button type="button" onClick={() => pan(1)} disabled={safeOffset >= maxOffset}
                className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </>
          )}
          <button type="button" onClick={zoomIn} disabled={zoom >= 8}
            className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30" title="Zoom in">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
          <button type="button" onClick={zoomOut} disabled={zoom <= 1}
            className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30" title="Zoom out">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto rounded-lg">
        <svg viewBox={`0 0 ${VW} ${VH}`} width={VW} height={VH}
          style={{ minWidth: VW, display: 'block' }}
          aria-label="Grade over time chart" role="img">

          {/* Grid */}
          {gridY.map(v => (
            <g key={v}>
              <line x1={L} y1={cy(v)} x2={VW - R} y2={cy(v)}
                stroke="currentColor" strokeWidth="0.5"
                strokeDasharray={v % 10 === 0 ? undefined : '3 4'}
                className="text-muted-foreground"
                opacity={v % 10 === 0 ? 0.2 : 0.1} />
              <text x={L - 5} y={cy(v)} textAnchor="end" dominantBaseline="middle"
                fontSize="8.5" className="fill-muted-foreground/65">{v}%</text>
            </g>
          ))}

          {/* Original trajectory — dimmed + dashed when what-if active */}
          {visible.length > 1 && (
            <path d={origPath} fill="none"
              stroke={hasAnyOverride ? 'white' : courseColor}
              strokeWidth={hasAnyOverride ? 1.5 : 2}
              strokeLinecap="round" strokeLinejoin="round"
              opacity={0.5}
              strokeDasharray={hasAnyOverride ? '4 3' : undefined}
            />
          )}

          {/* What-if trajectory */}
          {hasAnyOverride && whatIfPath && visible.length > 1 && (
            <path d={whatIfPath} fill="none"
              stroke={courseColor}
              strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"
              opacity={0.75}
            />
          )}

          {/* Points */}
          {visible.map((p, i) => {
            const x = cx(i)
            const origY = cy(p.origGrade)
            const whatIfY = cy(p.whatIfGrade)
            const isTip = tooltip?.idx === i
            const gradeDiff = p.whatIfGrade - p.origGrade

            return (
              <g key={`${p.assignmentId}-${i}`}
                onMouseEnter={() => setTooltip({ idx: i })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'pointer' }}>

                {/* Wide invisible hit area */}
                <rect x={x - 14} y={T - 4} width={28} height={PH + 8} fill="rgba(0,0,0,0)" />

                {/* Original dot — ghost when what-if active */}
                <circle cx={x} cy={origY} r={hasAnyOverride ? 2.5 : (isTip ? 6 : 4)}
                  fill="white"
                  stroke={courseColor}
                  strokeWidth={hasAnyOverride ? 1 : 2}
                  opacity={hasAnyOverride ? 0.3 : 1} />

                {/* What-if dot */}
                {hasAnyOverride && (
                  <circle cx={x} cy={whatIfY} r={isTip ? 6 : 4}
                    fill="white"
                    stroke={courseColor}
                    strokeWidth="2" />
                )}

                {/* Hover tooltip */}
                {isTip && (() => {
                  const dotY = hasAnyOverride ? whatIfY : origY
                  const tipX = Math.min(Math.max(x, L + 72), VW - R - 72)
                  const tipH = hasAnyOverride ? 66 : 44
                  const tipY = Math.max(T, dotY - tipH - 6)
                  return (
                    <g>
                      <rect x={tipX - 72} y={tipY} width={144} height={tipH}
                        rx="4" fill="currentColor" className="text-card"
                        filter="drop-shadow(0 1px 4px rgba(0,0,0,.15))" />
                      {hasAnyOverride ? (
                        <>
                          <text x={tipX} y={tipY + 13} textAnchor="middle"
                            fontSize="9" fontWeight="600" className="fill-card-foreground"
                            style={{ pointerEvents: 'none' }}>
                            {p.whatIfGrade.toFixed(2)}%
                          </text>
                          <text x={tipX} y={tipY + 24} textAnchor="middle" fontSize="7"
                            className="fill-muted-foreground" style={{ pointerEvents: 'none' }}>
                            was {p.origGrade.toFixed(2)}% before changes
                          </text>
                          <text x={tipX} y={tipY + 36} textAnchor="middle" fontSize="7.5"
                            className="fill-muted-foreground" style={{ pointerEvents: 'none' }}>
                            {p.assignmentName.length > 24 ? p.assignmentName.slice(0, 24) + '…' : p.assignmentName}
                          </text>
                          <text x={tipX} y={tipY + 47} textAnchor="middle" fontSize="7"
                            style={{ fill: courseColor, pointerEvents: 'none' }}>
                            {p.catName}
                          </text>
                          <text x={tipX} y={tipY + 58} textAnchor="middle" fontSize="7"
                            fill={gradeDiff >= 0 ? '#10b981' : '#ef4444'} style={{ pointerEvents: 'none' }}>
                            {gradeDiff >= 0 ? '+' : ''}{gradeDiff.toFixed(2)}% what-if
                          </text>
                        </>
                      ) : (
                        <>
                          <text x={tipX} y={tipY + 13} textAnchor="middle"
                            fontSize="9" fontWeight="600" className="fill-card-foreground"
                            style={{ pointerEvents: 'none' }}>
                            {p.origGrade.toFixed(2)}%
                          </text>
                          <text x={tipX} y={tipY + 26} textAnchor="middle" fontSize="7.5"
                            className="fill-muted-foreground" style={{ pointerEvents: 'none' }}>
                            {p.assignmentName.length > 24 ? p.assignmentName.slice(0, 24) + '…' : p.assignmentName}
                          </text>
                          <text x={tipX} y={tipY + 37} textAnchor="middle" fontSize="7"
                            style={{ fill: courseColor, pointerEvents: 'none' }}>
                            {p.catName}
                          </text>
                        </>
                      )}
                    </g>
                  )
                })()}

                {/* X-axis date label */}
                {(visible.length <= 8 || i % Math.ceil(visible.length / 8) === 0) && (
                  <text x={x} y={T + PH + 14} textAnchor="middle" fontSize="7.5"
                    className="fill-muted-foreground/65">
                    {new Date(p.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Scrubber */}
      {zoom > 1 && (
        <div className="mt-1 flex gap-px overflow-hidden rounded" style={{ height: 6 }}>
          {points.map((p, i) => (
            <div key={`scr-${p.assignmentId}-${i}`}
              className={cn('flex-1', i >= safeOffset && i < safeOffset + windowSize ? 'bg-primary' : 'bg-border')} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── What-If Calculator ────────────────────────────────────────────────────────
type CalcProps = {
  course: Course
  rawInputs: Record<string, string>
  setRawInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  hypotheticals: Hypo[]
  setHypotheticals: React.Dispatch<React.SetStateAction<Hypo[]>>
  overrides: Record<string, number | null>
  calcedGrade: number | null
}

function WhatIfCalculator({
  course, rawInputs, setRawInputs, hypotheticals, setHypotheticals, overrides, calcedGrade,
}: CalcProps) {
  const uid = useId()
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newScore, setNewScore] = useState('100')
  const [newPts, setNewPts] = useState('100')

  const hasChanges = Object.keys(rawInputs).length > 0 || hypotheticals.length > 0
  const diff = calcedGrade !== null ? calcedGrade - course.grade : 0

  function handleInput(id: string, val: string) {
    setRawInputs(prev => ({ ...prev, [id]: val }))
  }
  function clearInput(id: string) {
    setRawInputs(prev => { const next = { ...prev }; delete next[id]; return next })
  }
  function addHypo(catId: string) {
    const score = parseFloat(newScore)
    const pts = parseFloat(newPts)
    if (!newName.trim() || isNaN(score) || isNaN(pts) || pts <= 0) return
    setHypotheticals(prev => [...prev, {
      id: `hypo-${Date.now()}`,
      categoryId: catId,
      name: newName.trim(),
      score: Math.min(score, pts),
      pointsPossible: pts,
    }])
    setNewName(''); setNewScore('100'); setNewPts('100'); setAddingTo(null)
  }
  function removeHypo(id: string) {
    setHypotheticals(prev => prev.filter(h => h.id !== id))
  }
  function reset() { setRawInputs({}); setHypotheticals([]); setAddingTo(null) }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" className="text-primary" aria-hidden="true">
            <path d="M2 20h.01M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/>
          </svg>
          <p className="text-[13px] font-semibold text-foreground">What-If Calculator</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && calcedGrade !== null && (
            <div className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums',
              diff >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                       : 'bg-red-500/10 text-red-500 dark:text-red-400'
            )}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
              <span className="font-medium opacity-70">→ {calcedGrade.toFixed(2)}% {gradeLetterFrom(calcedGrade)}</span>
            </div>
          )}
          {hasChanges && (
            <button type="button" onClick={reset}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3.5 border-b border-border px-4 py-2">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <span className="inline-block h-2 w-2 rounded-sm border border-border/40 bg-muted/10" />
          original
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <span className="inline-block h-2 w-2 rounded-sm border border-primary/40 bg-primary/6" />
          changed
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
          <span className="inline-block h-2 w-2 rounded-sm border border-red-400/40 bg-red-500/6" />
          clear to exclude
        </span>
      </div>

      <div className="divide-y divide-border">
        {course.categories.map(cat => {
          const catHypos = hypotheticals.filter(h => h.categoryId === cat.id)
          return (
            <div key={cat.id} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-foreground">{cat.name}
                  <span className="ml-1.5 font-normal text-muted-foreground">{cat.weight}%</span>
                </p>
                <button type="button"
                  onClick={() => { setAddingTo(cat.id === addingTo ? null : cat.id); setNewName(''); setNewScore('100'); setNewPts('100') }}
                  className="text-[10px] font-medium text-primary hover:underline">
                  + Add assignment
                </button>
              </div>

              <div className="space-y-1">
                {cat.assignments.filter(a => a.score !== null).map(a => {
                  const isChanged  = a.id in rawInputs
                  const isExcluded = isChanged && rawInputs[a.id] === ''
                  const rawVal     = isChanged ? rawInputs[a.id] : String(a.score!)
                  const numVal     = parseFloat(rawVal)
                  const pct        = !isExcluded && !isNaN(numVal) ? (numVal / a.pointsPossible) * 100 : null

                  return (
                    <div key={a.id} className="flex items-center gap-2">
                      <span className={cn('min-w-0 flex-1 truncate text-[11px]',
                        isExcluded ? 'text-muted-foreground/40 line-through'
                        : isChanged ? 'text-foreground font-medium'
                        : 'text-muted-foreground')}>
                        {a.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">/{a.pointsPossible}</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={rawVal}
                        placeholder="—"
                        onChange={e => handleInput(a.id, e.target.value)}
                        className={cn(
                          'w-16 rounded border px-1.5 py-0.5 text-center text-[11px] tabular-nums outline-none transition-colors focus:ring-1 focus:ring-primary',
                          isExcluded
                            ? 'border-red-400/40 bg-red-500/6 text-red-400 focus:ring-red-400'
                            : isChanged
                            ? 'border-primary/40 bg-primary/6 text-foreground'
                            : 'border-border/40 bg-muted/10 text-foreground/55'
                        )}
                        aria-label={`Score for ${a.name}`}
                      />
                      <span className={cn('w-10 text-right text-[11px] font-semibold tabular-nums',
                        isExcluded ? 'text-muted-foreground/30' : pct !== null ? gradeColor(pct) : 'text-muted-foreground/30')}>
                        {isExcluded ? '—' : pct !== null ? `${pct.toFixed(0)}%` : '—'}
                      </span>
                      {isChanged && (
                        <button type="button" onClick={() => clearInput(a.id)}
                          className="text-muted-foreground/50 hover:text-muted-foreground">
                          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}

                {catHypos.map(h => (
                  <div key={h.id} className="flex items-center gap-2 rounded bg-violet-500/8 px-1.5 py-0.5">
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-violet-600 dark:text-violet-400">
                      ✦ {h.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">{h.score}/{h.pointsPossible}</span>
                    <span className="w-10 text-right text-[11px] font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                      {((h.score / h.pointsPossible) * 100).toFixed(0)}%
                    </span>
                    <button type="button" onClick={() => removeHypo(h.id)}
                      className="text-muted-foreground/50 hover:text-muted-foreground">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {addingTo === cat.id && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-2">
                  <input
                    id={`${uid}-name`}
                    type="text"
                    placeholder="Assignment name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-border bg-card px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <input type="number" min={0} step={0.5} placeholder="Score"
                    value={newScore} onChange={e => setNewScore(e.target.value)}
                    className="w-14 rounded border border-border bg-card px-1.5 py-1 text-center text-[11px] outline-none focus:ring-1 focus:ring-primary" />
                  <span className="text-[11px] text-muted-foreground">/</span>
                  <input type="number" min={1} step={1} placeholder="Pts"
                    value={newPts} onChange={e => setNewPts(e.target.value)}
                    className="w-14 rounded border border-border bg-card px-1.5 py-1 text-center text-[11px] outline-none focus:ring-1 focus:ring-primary" />
                  <button type="button" onClick={() => addHypo(cat.id)}
                    className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:opacity-90">
                    Add
                  </button>
                  <button type="button" onClick={() => setAddingTo(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Category breakdown helper ─────────────────────────────────────────────────
function catAverage(assignments: Course['categories'][number]['assignments']): number | null {
  const scored = assignments.filter(a => a.score !== null)
  if (!scored.length) return null
  return scored.reduce((s, a) => s + (a.score! / a.pointsPossible) * 100, 0) / scored.length
}

// ── Main CourseDetail ─────────────────────────────────────────────────────────
type Props = {
  course: Course
  semesterLabel: string
  onBack: () => void
  courses?: Course[]
  courseIndex?: number
  onCourseChange?: (c: Course) => void
}

export function CourseDetail({ course, semesterLabel, onBack, courses, courseIndex, onCourseChange }: Props) {
  // Shared state — both chart and calculator read from these
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})
  const [hypotheticals, setHypotheticals] = useState<Hypo[]>([])

  // ── Swipe / keyboard navigation ───────────────────────────────────────────
  const [swipeExit, setSwipeExit] = useState<'left' | 'right' | null>(null)
  const exitingRef = useRef(false)
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null)

  function triggerExit(dir: 'left' | 'right', cb: () => void) {
    if (exitingRef.current) return
    exitingRef.current = true
    setSwipeExit(dir)
    setTimeout(() => { exitingRef.current = false; cb() }, 210)
  }

  function goBack() { triggerExit('right', onBack) }
  function goNext() {
    if (!courses || courseIndex === undefined || courseIndex >= courses.length - 1) return
    triggerExit('left', () => onCourseChange?.(courses[courseIndex + 1]))
  }
  function goPrev() {
    if (courses && courseIndex !== undefined && courseIndex > 0) {
      triggerExit('right', () => onCourseChange?.(courses[courseIndex - 1]))
    } else {
      triggerExit('right', onBack)
    }
  }

  // Stable refs so keyboard listener never re-subscribes
  const goBackRef  = useRef(goBack)
  const goNextRef  = useRef(goNext)
  const goPrevRef  = useRef(goPrev)
  goBackRef.current  = goBack
  goNextRef.current  = goNext
  goPrevRef.current  = goPrev

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrevRef.current() }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNextRef.current() }
      if (e.key === 'Escape')     { e.preventDefault(); goBackRef.current() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    const dt = Date.now() - touchStart.current.t
    touchStart.current = null
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    const velocity = Math.abs(dx) / dt
    if (Math.abs(dx) < 60 && velocity < 0.3) return
    if (dx > 0) goPrevRef.current()
    else goNextRef.current()
  }

  const overrides = deriveOverrides(rawInputs)
  const hasChanges = Object.keys(rawInputs).length > 0 || hypotheticals.length > 0
  const calcedGrade = hasChanges ? calcGrade(course, overrides, hypotheticals) : null

  const delta = course.trendData.length >= 2
    ? course.trendData[course.trendData.length - 1] - course.trendData[0]
    : 0
  const deltaLabel = delta === 0 ? null : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}%`
  const deltaColor = delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'

  const allMissing = course.categories.flatMap(cat =>
    cat.assignments.filter(a => a.status === 'missing' || a.status === 'late')
      .map(a => ({ ...a, catName: cat.name }))
  )
  const allScored = course.categories.flatMap(cat =>
    cat.assignments.filter(a => a.score !== null && a.percent !== null)
      .map(a => ({ ...a, catName: cat.name }))
  )
  const helping = [...allScored].sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0)).slice(0, 3)
  const dragging = [...allScored].sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0))
    .filter(a => !allMissing.find(m => m.id === a.id)).slice(0, 3)

  // Display grade: show calced grade if calculator is active
  const displayGrade = calcedGrade !== null ? calcedGrade : course.grade
  const displayLetter = calcedGrade !== null ? gradeLetterFrom(calcedGrade) : course.letterGrade
  const gradeDiff = calcedGrade !== null ? calcedGrade - course.grade : null

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={swipeExit ? {
        animation: `slide-out-${swipeExit} 0.21s cubic-bezier(0.22,1,0.36,1) both`,
        pointerEvents: 'none',
      } : undefined}
    >
      {/* Back + course navigation */}
      <div className="mb-4 flex items-center justify-between"
        style={{ animation: 'detail-in 0.26s cubic-bezier(0.22,1,0.36,1) both' }}>
        <button type="button" onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to all courses
        </button>

        {/* Prev / next course buttons */}
        {courses && courses.length > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={goPrev}
              disabled={courseIndex === 0}
              title="Previous course (←)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="min-w-[32px] text-center text-[10px] tabular-nums text-muted-foreground/60">
              {courseIndex !== undefined ? `${courseIndex + 1}/${courses.length}` : ''}
            </span>
            <button type="button" onClick={goNext}
              disabled={courseIndex === undefined || courseIndex >= courses.length - 1}
              title="Next course (→)"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Course header */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card"
        style={{ animation: 'detail-in 0.28s cubic-bezier(0.22,1,0.36,1) 50ms both' }}>
        <div className="h-2" style={{ backgroundColor: course.color }} />
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{course.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {course.teacher} · Period {course.period} · {semesterLabel}
            </p>
          </div>
          <div className="text-right">
            <p className={cn('text-4xl font-bold tabular-nums leading-none', gradeColor(displayGrade))}>
              {displayGrade.toFixed(2)}<span className="text-2xl">%</span>
            </p>
            <p className="mt-1 text-base font-semibold text-muted-foreground">{displayLetter}</p>
            {gradeDiff !== null && (
              <p className={cn('mt-1 text-[12px] font-semibold tabular-nums',
                gradeDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
                {gradeDiff >= 0 ? '+' : ''}{gradeDiff.toFixed(2)}% what-if
              </p>
            )}
            {deltaLabel && gradeDiff === null && (
              <p className={cn('mt-1 text-[12px] font-semibold tabular-nums', deltaColor)}>
                {deltaLabel} this semester
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grade trajectory chart — updates live with what-if overrides */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card px-5 py-4"
        style={{ animation: 'detail-in 0.28s cubic-bezier(0.22,1,0.36,1) 100ms both' }}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Grade Over Time
        </p>
        <GradeTimelineChart course={course} courseColor={course.color} overrides={overrides} />
      </div>

      {/* Category breakdown + grade drivers */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2"
        style={{ animation: 'detail-in 0.28s cubic-bezier(0.22,1,0.36,1) 160ms both' }}>
        <div className="overflow-hidden rounded-xl border border-border bg-card px-5 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category Breakdown</p>
          <div className="space-y-3">
            {course.categories.map(cat => {
              const avg = catAverage(cat.assignments)
              const barWidth = avg !== null ? `${Math.max(0, ((avg - 60) / 40) * 100).toFixed(1)}%` : '0%'
              return (
                <div key={cat.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{cat.weight}% weight</span>
                      <span className={cn('text-[12px] font-semibold tabular-nums',
                        avg !== null ? gradeColor(avg) : 'text-muted-foreground/40')}>
                        {avg !== null ? `${avg.toFixed(2)}%` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full transition-all', avg !== null ? pctBarColor(avg) : '')}
                      style={{ width: barWidth }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border/50 bg-destructive/5 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-destructive/80">Pulling Grade Down</p>
            </div>
            <div className="divide-y divide-border/50">
              {allMissing.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-destructive">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.catName}</p>
                  </div>
                  <StatusChip status={a.status} />
                </div>
              ))}
              {dragging.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-card-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.catName}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-red-500 dark:text-red-400">
                    {a.percent?.toFixed(2)}%
                  </span>
                </div>
              ))}
              {allMissing.length === 0 && dragging.length === 0 && (
                <p className="px-4 py-3 text-[12px] text-muted-foreground">Nothing notable.</p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border/50 bg-emerald-500/5 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Helping Your Grade</p>
            </div>
            <div className="divide-y divide-border/50">
              {helping.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-card-foreground">{a.name}</p>
                    <p className="text-[10px] text-muted-foreground">{a.catName}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {a.percent?.toFixed(2)}%
                  </span>
                </div>
              ))}
              {helping.length === 0 && (
                <p className="px-4 py-3 text-[12px] text-muted-foreground">No scored assignments yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* What-If Calculator — shares state with chart */}
      {course.categories.some(c => c.assignments.length > 0) && (
        <div style={{ animation: 'detail-in 0.28s cubic-bezier(0.22,1,0.36,1) 220ms both' }}>
          <WhatIfCalculator
            course={course}
            rawInputs={rawInputs}
            setRawInputs={setRawInputs}
            hypotheticals={hypotheticals}
            setHypotheticals={setHypotheticals}
            overrides={overrides}
            calcedGrade={calcedGrade}
          />
        </div>
      )}
    </div>
  )
}
