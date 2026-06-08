'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Course, Category } from '@/lib/types'

type Hyp = { score: string; max: string }

// Total-points method: (sumScore + hypotheticals) / (sumMax + hypotheticals)
function catAvg(
  cat: Category,
  hyps: Hyp[]
): { pct: number; pts: number; max: number } | null {
  const scored = cat.assignments.filter((a) => a.score !== null && a.pointsPossible > 0)
  let pts = scored.reduce((s, a) => s + a.score!, 0)
  let max = scored.reduce((s, a) => s + a.pointsPossible, 0)
  for (const h of hyps) {
    const s = parseFloat(h.score)
    const m = parseFloat(h.max)
    if (!isNaN(s) && !isNaN(m) && m > 0) { pts += s; max += m }
  }
  return max > 0 ? { pct: (pts / max) * 100, pts, max } : null
}

function weightedGrade(course: Course, hypsMap: Record<string, Hyp[]>): number | null {
  let wSum = 0, wTotal = 0
  for (const cat of course.categories) {
    if (cat.weight === 0) continue
    const avg = catAvg(cat, hypsMap[cat.id] ?? [])
    if (!avg) continue
    wSum   += avg.pct * cat.weight
    wTotal += cat.weight
  }
  return wTotal > 0 ? wSum / wTotal : null
}

// What score `s` is needed on an `assignmentMax`-point assignment in `focusCatId`
// to hit `targetPct` overall, given current hypotheticals?
function neededScore(
  course: Course,
  hypsMap: Record<string, Hyp[]>,
  targetPct: number,
  focusCatId: string,
  assignmentMax: number
): number | null {
  const focusCat = course.categories.find((c) => c.id === focusCatId)
  if (!focusCat || focusCat.weight === 0) return null

  // Weighted sum of all other categories that have data
  let otherSum = 0, otherWeight = 0
  for (const cat of course.categories) {
    if (cat.weight === 0 || cat.id === focusCatId) continue
    const avg = catAvg(cat, hypsMap[cat.id] ?? [])
    if (!avg) continue
    otherSum   += avg.pct * cat.weight
    otherWeight += cat.weight
  }

  // Effective total weight = other cats with data + focus cat
  const totalEffectiveWeight = otherWeight + focusCat.weight

  // Solve: targetPct = (avgFocus * wFocus + otherSum) / totalEffectiveWeight
  const neededAvgPct = (targetPct * totalEffectiveWeight - otherSum) / focusCat.weight

  // Current state of focus category (without the new assignment)
  const cur = catAvg(focusCat, hypsMap[focusCatId] ?? [])
  const curPts = cur ? cur.pts : 0
  const curMax = cur ? cur.max : 0

  // avgFocus = (curPts + s) / (curMax + assignmentMax) * 100 = neededAvgPct
  return (neededAvgPct / 100) * (curMax + assignmentMax) - curPts
}

function gradeColor(pct: number) {
  if (pct >= 93) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 90) return 'text-green-600 dark:text-green-400'
  if (pct >= 87) return 'text-lime-700 dark:text-lime-400'
  if (pct >= 83) return 'text-amber-600 dark:text-amber-400'
  if (pct >= 80) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-500 dark:text-red-400'
}

function letterGrade(pct: number) {
  if (pct >= 97) return 'A+'
  if (pct >= 93) return 'A'
  if (pct >= 90) return 'A-'
  if (pct >= 87) return 'B+'
  if (pct >= 83) return 'B'
  if (pct >= 80) return 'B-'
  if (pct >= 77) return 'C+'
  if (pct >= 73) return 'C'
  if (pct >= 70) return 'C-'
  if (pct >= 67) return 'D+'
  if (pct >= 63) return 'D'
  if (pct >= 60) return 'D-'
  return 'F'
}

export function GradeCalculator({ course }: { course: Course }) {
  const [open, setOpen]           = useState(false)
  const [hypsMap, setHypsMap]     = useState<Record<string, Hyp[]>>({})
  const [inputs, setInputs]       = useState<Record<string, { score: string; max: string }>>({})
  const [mode, setMode]           = useState<'whatif' | 'target'>('whatif')
  const [targetGrade, setTargetGrade] = useState(course.grade.toFixed(1))
  const [focusCatId, setFocusCatId]   = useState(
    course.categories.find((c) => c.weight > 0)?.id ?? ''
  )
  const [targetMax, setTargetMax] = useState('100')

  const projected  = useMemo(() => weightedGrade(course, hypsMap), [course, hypsMap])
  const hasChanges = Object.values(hypsMap).some((hs) => hs.length > 0)

  const needed = useMemo(() => {
    if (mode !== 'target') return null
    const t = parseFloat(targetGrade)
    const m = parseFloat(targetMax)
    if (isNaN(t) || isNaN(m) || m <= 0) return null
    return neededScore(course, hypsMap, t, focusCatId, m)
  }, [mode, course, hypsMap, targetGrade, focusCatId, targetMax])

  function addHyp(catId: string) {
    const inp = inputs[catId]
    if (!inp) return
    const s = parseFloat(inp.score)
    const m = parseFloat(inp.max)
    if (isNaN(s) || isNaN(m) || m <= 0) return
    setHypsMap((prev) => ({
      ...prev,
      [catId]: [...(prev[catId] ?? []), { score: inp.score, max: inp.max }],
    }))
    setInputs((prev) => ({ ...prev, [catId]: { score: '', max: '' } }))
  }

  function removeHyp(catId: string, idx: number) {
    setHypsMap((prev) => ({
      ...prev,
      [catId]: (prev[catId] ?? []).filter((_, i) => i !== idx),
    }))
  }

  const projectedDisplay = projected ?? course.grade
  const delta = projectedDisplay - course.grade
  const weightedCats = course.categories.filter((c) => c.weight > 0)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card/80 hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Grade Calculator
        </span>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span className="text-[12px] font-semibold text-foreground">Grade Calculator</span>
          {hasChanges && (
            <button
              type="button"
              onClick={() => setHypsMap({})}
              className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close calculator"
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── Grade banner ─────────────────────────────────────── */}
      <div className="flex items-center gap-5 border-b border-border bg-muted/25 px-5 py-3">
        <div>
          <p className="mb-0.5 text-[10px] text-muted-foreground">Current</p>
          <p className={cn('text-2xl font-bold tabular-nums leading-none', gradeColor(course.grade))}>
            {course.grade.toFixed(1)}<span className="text-lg">%</span>
          </p>
        </div>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted-foreground/40" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
        <div>
          <p className="mb-0.5 text-[10px] text-muted-foreground">Projected</p>
          <p className={cn('text-2xl font-bold tabular-nums leading-none', gradeColor(projectedDisplay))}>
            {projectedDisplay.toFixed(1)}<span className="text-lg">%</span>
            <span className="ml-1.5 text-base font-semibold">{letterGrade(projectedDisplay)}</span>
          </p>
        </div>
        {hasChanges && Math.abs(delta) >= 0.01 && (
          <span className={cn(
            'ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums',
            delta > 0
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 text-red-500 dark:text-red-400'
          )}>
            {delta > 0 ? '+' : ''}{delta.toFixed(2)}%
          </span>
        )}
      </div>

      {/* ── Mode tabs ────────────────────────────────────────── */}
      <div className="flex border-b border-border">
        {(['whatif', 'target'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 py-2 text-[11px] font-semibold transition-colors',
              mode === m
                ? 'border-b-2 border-primary text-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m === 'whatif' ? 'What-if Grades' : 'What Do I Need?'}
          </button>
        ))}
      </div>

      {/* ── What-if mode ─────────────────────────────────────── */}
      {mode === 'whatif' && (
        <div className="divide-y divide-border">
          {weightedCats.map((cat) => {
            const current   = catAvg(cat, [])
            const projected = catAvg(cat, hypsMap[cat.id] ?? [])
            const hyps      = hypsMap[cat.id] ?? []
            const inp       = inputs[cat.id] ?? { score: '', max: '' }
            const dispPct   = projected?.pct ?? current?.pct

            return (
              <div key={cat.id} className="px-5 py-3">
                {/* Category header row */}
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-[12px] font-semibold text-foreground">{cat.name}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] text-muted-foreground">{cat.weight}% weight</span>
                    {dispPct !== undefined ? (
                      <span className={cn('text-[11px] font-semibold tabular-nums', gradeColor(dispPct))}>
                        {dispPct.toFixed(1)}%
                        {projected && current && Math.abs(projected.pct - current.pct) >= 0.01 && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            (was {current.pct.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/40">No data</span>
                    )}
                  </div>
                </div>

                {/* Added hypotheticals */}
                {hyps.map((h, i) => (
                  <div key={i} className="mb-1.5 flex items-center gap-2 rounded-md bg-primary/5 px-2.5 py-1.5">
                    <span className="text-[11px] text-primary tabular-nums">
                      +{h.score} / {h.max} pts
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHyp(cat.id, i)}
                      aria-label="Remove"
                      className="ml-auto text-muted-foreground/50 transition-colors hover:text-destructive"
                    >
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Input row */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="Score"
                    value={inp.score}
                    min={0}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [cat.id]: { ...inp, score: e.target.value } }))
                    }
                    onKeyDown={(e) => { if (e.key === 'Enter') addHyp(cat.id) }}
                    className="w-[4.5rem] rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <span className="text-[11px] text-muted-foreground/50">/</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={inp.max}
                    min={1}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [cat.id]: { ...inp, max: e.target.value } }))
                    }
                    onKeyDown={(e) => { if (e.key === 'Enter') addHyp(cat.id) }}
                    className="w-[4.5rem] rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => addHyp(cat.id)}
                    disabled={!inp.score || !inp.max}
                    className="rounded-md bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + Add
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Target mode ──────────────────────────────────────── */}
      {mode === 'target' && (
        <div className="space-y-4 px-5 py-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Find out what you need to score in a category to hit a target grade.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-foreground">
              Target:
              <input
                type="number"
                value={targetGrade}
                min={0}
                max={110}
                step={0.1}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              %
            </label>
            {!isNaN(parseFloat(targetGrade)) && (
              <span className={cn('text-[11px] font-semibold', gradeColor(parseFloat(targetGrade)))}>
                {letterGrade(parseFloat(targetGrade))}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-[12px] text-foreground">In:</label>
            <select
              value={focusCatId}
              onChange={(e) => setFocusCatId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {weightedCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.weight}%)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[12px] text-foreground">
              On an assignment worth:
              <input
                type="number"
                value={targetMax}
                min={1}
                onChange={(e) => setTargetMax(e.target.value)}
                className="w-16 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              pts
            </label>
          </div>

          {needed !== null && !isNaN(needed) && (
            <div className={cn(
              'rounded-xl border p-4',
              needed < 0
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : needed > parseFloat(targetMax)
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-emerald-500/30 bg-emerald-500/5'
            )}>
              {needed < 0 ? (
                <p className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                  You already exceed this target — even with a 0 on the next assignment.
                </p>
              ) : needed > parseFloat(targetMax) ? (
                <>
                  <p className="text-[13px] font-semibold text-amber-600 dark:text-amber-400">
                    Impossible with one assignment — you would need {needed.toFixed(1)} / {targetMax} pts ({(needed / parseFloat(targetMax) * 100).toFixed(1)}%).
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Try a higher-value assignment or add what-if entries first.
                  </p>
                </>
              ) : (
                <p className="text-[13px] font-semibold text-foreground">
                  You need{' '}
                  <span className={cn('tabular-nums', gradeColor((needed / parseFloat(targetMax)) * 100))}>
                    {needed.toFixed(1)} / {targetMax} pts
                  </span>
                  {' '}({((needed / parseFloat(targetMax)) * 100).toFixed(1)}%) in{' '}
                  {course.categories.find((c) => c.id === focusCatId)?.name}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
