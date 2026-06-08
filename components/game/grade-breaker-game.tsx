'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSchoolYears } from '@/lib/use-grades'
import { useAppStore } from '@/store/use-app-store'
import type { Assignment, Course } from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────

type Phase    = 'idle' | 'active' | 'won' | 'dead'
type LevelNum = 1 | 2 | 3
type Tier     = 'low' | 'med' | 'high'

type GameBrick = {
  id: string
  name: string
  course: string
  color: string
  tier: Tier
  hp: number        // current hit points
  maxHp: number
  pts: number       // score on destroy
  x: number; y: number; w: number; h: number
  alive: boolean
  hitFlash: number  // frames of white flash remaining
}

type Ball = { x: number; y: number; vx: number; vy: number }

// ── Constants ──────────────────────────────────────────────────────────────

const CANVAS_H = 540
const BALL_R   = 7
const PAD_H    = 12
const PAD_W    = 120
const PAD_FLOOR = 30
const BRICK_H  = 38
const BRICK_GAP = 7
const BRICK_TOP = 22

const TIER_CFG: Record<Tier, { maxHp: number; pts: number }> = {
  low:  { maxHp: 1, pts: 5  },
  med:  { maxHp: 1, pts: 10 },
  high: { maxHp: 2, pts: 25 },
}

const LEVEL_DEFS = {
  1: {
    label: 'Missing Work',
    sub: 'Your overdue assignments',
    badge: '🔴',
    cols: 3,
    cap: 15,
    baseSpeed: 4.2,
    speedPerHit: 0.09,
    maxSpeed: 9,
    filter: (a: Assignment) => a.status === 'missing' || a.status === 'late',
  },
  2: {
    label: 'Incomplete',
    sub: 'Everything not yet graded',
    badge: '🟡',
    cols: 4,
    cap: 20,
    baseSpeed: 4.8,
    speedPerHit: 0.11,
    maxSpeed: 11,
    filter: (a: Assignment) => a.score === null && a.status !== 'excused',
  },
  3: {
    label: 'Full Semester',
    sub: 'Every assignment — chaos mode',
    badge: '⚡',
    cols: 5,
    cap: 30,
    baseSpeed: 5.5,
    speedPerHit: 0.14,
    maxSpeed: 14,
    filter: () => true,
  },
} as const

// ── Helpers ────────────────────────────────────────────────────────────────

function getTier(pts: number): Tier {
  if (pts <= 10) return 'low'
  if (pts <= 50) return 'med'
  return 'high'
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function buildBricks(courses: Course[], level: LevelNum, cw: number): GameBrick[] {
  const def   = LEVEL_DEFS[level]
  const items: { assignment: Assignment; course: Course }[] = []

  for (const course of courses) {
    for (const cat of course.categories) {
      for (const a of cat.assignments) {
        if (def.filter(a)) items.push({ assignment: a, course })
      }
    }
  }

  // Sort: missing/late first, then by due date
  items.sort((a, b) => {
    const priority = (s: string) => s === 'missing' ? 0 : s === 'late' ? 1 : 2
    const pa = priority(a.assignment.status), pb = priority(b.assignment.status)
    if (pa !== pb) return pa - pb
    return new Date(a.assignment.dueDate).getTime() - new Date(b.assignment.dueDate).getTime()
  })

  const capped = items.slice(0, def.cap)
  const cols = Math.min(def.cols, capped.length)
  if (cols === 0) return []
  const bw = (cw - BRICK_GAP * (cols + 1)) / cols

  return capped.map((item, i) => {
    const tier = getTier(item.assignment.pointsPossible)
    const { maxHp, pts } = TIER_CFG[tier]
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      id:       item.assignment.id,
      name:     item.assignment.name.length > 28
                  ? item.assignment.name.slice(0, 27) + '…'
                  : item.assignment.name,
      course:   item.course.name,
      color:    item.course.color.startsWith('#') ? item.course.color : '#6366f1',
      tier,
      hp:       maxHp,
      maxHp,
      pts,
      x:        BRICK_GAP + col * (bw + BRICK_GAP),
      y:        BRICK_TOP + row * (BRICK_H + BRICK_GAP),
      w:        bw,
      h:        BRICK_H,
      alive:    true,
      hitFlash: 0,
    }
  })
}

// ── Component ──────────────────────────────────────────────────────────────

export function GradeBreakerGame() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const wrapRef     = useRef<HTMLDivElement>(null)
  const [level, setLevel] = useState<LevelNum>(1)

  const { schoolYears }  = useSchoolYears()
  const selectedYearId   = useAppStore((s) => s.selectedYearId)
  const selectedSemId    = useAppStore((s) => s.selectedSemesterId)

  const year     = schoolYears.find((y) => y.id === selectedYearId) ?? schoolYears[0]
  const semester = year?.semesters.find((s) => s.id === selectedSemId) ?? year?.semesters[0]
  const courses  = semester?.courses ?? []

  // All mutable game state in a ref — never causes renders
  const G = useRef<{
    phase: Phase; bricks: GameBrick[]; ball: Ball
    padX: number; lives: number; score: number
    bricksHit: number; currentSpeed: number
    level: LevelNum; w: number
  }>({
    phase: 'idle', bricks: [], ball: { x: 0, y: 0, vx: 0, vy: 0 },
    padX: 0, lives: 3, score: 0, bricksHit: 0,
    currentSpeed: LEVEL_DEFS[1].baseSpeed, level: 1, w: 0,
  })
  const rafRef = useRef(0)

  // React state only for overlay UI
  const [ui, setUi] = useState<{
    phase: Phase; lives: number; score: number
    bricksLeft: number; speed: number; totalBricks: number
  }>({ phase: 'idle', lives: 3, score: 0, bricksLeft: 0, speed: 4.2, totalBricks: 0 })

  const sync = useCallback(() => {
    const g   = G.current
    const rem = g.bricks.filter((b) => b.alive).length
    setUi({
      phase:       g.phase,
      lives:       g.lives,
      score:       g.score,
      bricksLeft:  rem,
      totalBricks: g.bricks.length,
      speed:       parseFloat(g.currentSpeed.toFixed(1)),
    })
  }, [])

  const launch = useCallback((lvl: LevelNum) => {
    const g   = G.current
    const cw  = g.w
    const def = LEVEL_DEFS[lvl]
    g.level        = lvl
    g.bricks       = buildBricks(courses, lvl, cw)
    g.lives        = 3
    g.score        = 0
    g.bricksHit    = 0
    g.currentSpeed = def.baseSpeed
    g.padX         = cw / 2 - PAD_W / 2
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.7
    g.ball  = { x: cw / 2, y: CANVAS_H - PAD_FLOOR - 50, vx: Math.cos(a) * def.baseSpeed, vy: Math.sin(a) * def.baseSpeed }
    g.phase = 'active'
    sync()
  }, [courses, sync])

  // Canvas + game loop — stable across renders
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    const ro = new ResizeObserver(() => {
      const w = Math.floor(wrap.clientWidth)
      canvas.width  = w
      canvas.height = CANVAS_H
      G.current.w   = w
    })
    ro.observe(wrap)

    const onMouse = (e: MouseEvent) => {
      if (G.current.phase !== 'active') return
      const rect = canvas.getBoundingClientRect()
      G.current.padX = Math.max(0, Math.min(G.current.w - PAD_W, e.clientX - rect.left - PAD_W / 2))
    }
    const onTouch = (e: TouchEvent) => {
      if (G.current.phase !== 'active') return
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      G.current.padX = Math.max(0, Math.min(G.current.w - PAD_W, e.touches[0].clientX - rect.left - PAD_W / 2))
    }
    canvas.addEventListener('mousemove', onMouse)
    canvas.addEventListener('touchmove', onTouch, { passive: false })

    function tick() {
      const g  = G.current
      const cw = g.w
      rafRef.current = requestAnimationFrame(tick)
      if (!cw) return

      // ── Physics ─────────────────────────────────────────
      if (g.phase === 'active') {
        const b   = g.ball
        const def = LEVEL_DEFS[g.level]

        b.x += b.vx
        b.y += b.vy

        // Walls + ceiling
        if (b.x - BALL_R < 0)  { b.x = BALL_R;      b.vx =  Math.abs(b.vx) }
        if (b.x + BALL_R > cw) { b.x = cw - BALL_R; b.vx = -Math.abs(b.vx) }
        if (b.y - BALL_R < 0)  { b.y = BALL_R;      b.vy =  Math.abs(b.vy) }

        // Paddle
        const py = CANVAS_H - PAD_FLOOR
        if (
          b.vy > 0 &&
          b.y + BALL_R >= py &&
          b.y + BALL_R <= py + PAD_H + 4 &&
          b.x >= g.padX && b.x <= g.padX + PAD_W
        ) {
          const hit = (b.x - (g.padX + PAD_W / 2)) / (PAD_W / 2)
          const a   = hit * (Math.PI / 3.2)
          const spd = g.currentSpeed
          b.vx = Math.sin(a) * spd
          b.vy = -Math.cos(a) * spd
          b.y  = py - BALL_R - 1
        }

        // Fell off bottom
        if (b.y - BALL_R > CANVAS_H) {
          g.lives--
          if (g.lives <= 0) {
            g.phase = 'dead'; sync()
          } else {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
            g.padX  = cw / 2 - PAD_W / 2
            b.x = cw / 2; b.y = CANVAS_H - PAD_FLOOR - 50
            b.vx = Math.cos(a) * g.currentSpeed
            b.vy = Math.sin(a) * g.currentSpeed
            sync()
          }
        }

        // Brick collision — one brick per frame
        let anyAlive = false
        for (const brick of g.bricks) {
          if (!brick.alive) continue
          anyAlive = true
          if (brick.hitFlash > 0) { brick.hitFlash--; continue }

          if (
            b.x + BALL_R > brick.x && b.x - BALL_R < brick.x + brick.w &&
            b.y + BALL_R > brick.y && b.y - BALL_R < brick.y + brick.h
          ) {
            brick.hp--
            brick.hitFlash = 6

            if (brick.hp <= 0) {
              brick.alive = false
              g.score    += brick.pts
              g.bricksHit++
              // Speed up the ball
              g.currentSpeed = Math.min(
                g.currentSpeed + def.speedPerHit,
                def.maxSpeed
              )
              const spd = g.currentSpeed
              const len = Math.hypot(b.vx, b.vy)
              if (len > 0) { b.vx = (b.vx / len) * spd; b.vy = (b.vy / len) * spd }
              sync()
            }

            // Bounce
            const oL = b.x + BALL_R - brick.x
            const oR = brick.x + brick.w - (b.x - BALL_R)
            const oT = b.y + BALL_R - brick.y
            const oB = brick.y + brick.h - (b.y - BALL_R)
            const mn = Math.min(oL, oR, oT, oB)
            if (mn === oT || mn === oB) b.vy = -b.vy; else b.vx = -b.vx
            break
          }
        }

        if (!anyAlive && g.bricks.length > 0 && g.phase === 'active') {
          g.phase = 'won'; sync()
        }
      }

      // ── Render ────────────────────────────────────────────
      ctx.clearRect(0, 0, cw, CANVAS_H)

      for (const b of g.bricks) {
        if (!b.alive) continue
        const damaged  = b.maxHp > 1 && b.hp < b.maxHp
        const flashing = b.hitFlash > 0

        ctx.save()
        if (flashing) {
          // White flash on hit
          ctx.fillStyle   = '#fff'
          ctx.globalAlpha = 0.9
        } else if (damaged) {
          // Cracked state: desaturate and dim
          ctx.fillStyle   = b.color
          ctx.globalAlpha = 0.45
        } else {
          ctx.fillStyle   = b.color
          ctx.globalAlpha = b.tier === 'low' ? 0.72 : b.tier === 'high' ? 0.95 : 0.85
        }
        rr(ctx, b.x, b.y, b.w, b.h, 8)
        ctx.fill()

        // High-tier glow
        if (b.tier === 'high' && !damaged && !flashing) {
          ctx.globalAlpha = 0.35
          ctx.strokeStyle = '#fff'
          ctx.lineWidth   = 2
          rr(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 7)
          ctx.stroke()
        }
        // Damaged cracks (dashed border)
        if (damaged) {
          ctx.globalAlpha   = 0.6
          ctx.strokeStyle   = '#fff'
          ctx.lineWidth     = 1.5
          ctx.setLineDash([4, 3])
          rr(ctx, b.x, b.y, b.w, b.h, 8)
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.globalAlpha = 1
        ctx.fillStyle   = flashing ? '#111' : '#fff'
        ctx.font        = 'bold 11px -apple-system,system-ui,sans-serif'
        ctx.textAlign   = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 - 7, b.w - 12)
        ctx.globalAlpha = flashing ? 0.6 : 0.65
        ctx.font        = '10px -apple-system,system-ui,sans-serif'
        ctx.fillText(b.course, b.x + b.w / 2, b.y + b.h / 2 + 8, b.w - 12)

        // HP pips for high-tier
        if (b.tier === 'high' && b.maxHp > 1) {
          ctx.globalAlpha = 0.8
          ctx.fillStyle   = b.hp > 1 ? '#fbbf24' : '#dc2626'
          const pipSize = 5
          ctx.fillRect(b.x + b.w - 9, b.y + 3, pipSize, pipSize)
        }

        ctx.restore()
      }

      if (g.phase === 'active') {
        // Speed aura on paddle — grows with speed
        const speedRatio = Math.min(1, (g.currentSpeed - LEVEL_DEFS[1].baseSpeed) / (LEVEL_DEFS[3].maxSpeed - LEVEL_DEFS[1].baseSpeed))
        const auraColor  = speedRatio < 0.33 ? '129,140,248' : speedRatio < 0.66 ? '251,191,36' : '239,68,68'

        ctx.save()
        ctx.fillStyle   = `rgba(${auraColor},0.9)`
        ctx.shadowColor = `rgba(${auraColor},0.6)`
        ctx.shadowBlur  = 8 + speedRatio * 20
        rr(ctx, g.padX, CANVAS_H - PAD_FLOOR, PAD_W, PAD_H, 6)
        ctx.fill()
        ctx.restore()

        // Ball
        ctx.save()
        ctx.beginPath()
        ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2)
        ctx.fillStyle   = '#fff'
        ctx.shadowColor = `rgba(${auraColor},0.8)`
        ctx.shadowBlur  = 12 + speedRatio * 12
        ctx.fill()
        ctx.restore()
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMouse)
      canvas.removeEventListener('touchmove', onTouch)
    }
  }, [sync])

  const hearts = [0, 1, 2].map((i) => i < ui.lives)
  const def    = LEVEL_DEFS[level]
  const speedPct = Math.min(100, ((ui.speed - def.baseSpeed) / (def.maxSpeed - def.baseSpeed)) * 100)

  return (
    <div className="flex flex-col gap-4">

      {/* Level selector */}
      <div className="flex gap-2">
        {([1, 2, 3] as LevelNum[]).map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setLevel(lvl)}
            className={[
              'flex-1 rounded-xl border px-4 py-3 text-left transition-colors',
              level === lvl
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{LEVEL_DEFS[lvl].badge}</span>
              <div>
                <p className="text-xs font-semibold leading-tight">
                  Level {lvl} — {LEVEL_DEFS[lvl].label}
                </p>
                <p className="mt-0.5 text-[10px] opacity-70 leading-tight">
                  {LEVEL_DEFS[lvl].sub}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Game canvas card */}
      <div ref={wrapRef} className="overflow-hidden rounded-xl border border-border">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
          <div className="flex items-center gap-3">
            {/* Lives */}
            <div className="flex gap-0.5">
              {hearts.map((alive, i) => (
                <svg key={i} viewBox="0 0 24 24" width="13" height="13"
                  fill={alive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
                  className={alive ? 'text-red-500' : 'text-muted-foreground/25'} aria-hidden="true"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              ))}
            </div>
            {/* Speed bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">SPD</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${speedPct}%`,
                    background: speedPct < 33 ? '#818cf8' : speedPct < 66 ? '#fbbf24' : '#ef4444',
                  }}
                />
              </div>
              <span className="text-[10px] font-semibold tabular-nums text-foreground">{ui.speed.toFixed(1)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ui.phase === 'active' && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {ui.bricksLeft}/{ui.totalBricks} bricks
              </span>
            )}
            <span className="text-[11px] font-semibold tabular-nums text-foreground">{ui.score} pts</span>
            {ui.phase !== 'idle' && (
              <button type="button" onClick={() => launch(level)}
                className="text-[11px] text-primary hover:opacity-70 transition-opacity">
                Restart
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="relative bg-card">
          <canvas ref={canvasRef} className="block w-full" style={{ height: CANVAS_H }} />

          {/* Idle */}
          {ui.phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">Grade Breaker</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {def.badge} {def.label} — {def.sub}
                </p>
                <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted-foreground/70">
                  <span>🔴 Low pts = 1 hit</span>
                  <span>🟡 Med pts = 1 hit</span>
                  <span>⚡ High pts = 2 hits</span>
                </div>
              </div>
              <button type="button" onClick={() => launch(level)}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all">
                Launch Ball
              </button>
            </div>
          )}

          {/* Won */}
          {ui.phase === 'won' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/85 backdrop-blur-sm">
              <p className="text-2xl font-bold text-foreground">All Cleared! 🎉</p>
              <p className="text-base font-semibold text-emerald-500">Score: {ui.score}</p>
              <p className="text-xs text-muted-foreground">Now go actually do those assignments</p>
              <div className="mt-3 flex gap-2">
                {level < 3 && (
                  <button type="button"
                    onClick={() => { setLevel((level + 1) as LevelNum); launch((level + 1) as LevelNum) }}
                    className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                    Next Level →
                  </button>
                )}
                <button type="button" onClick={() => launch(level)}
                  className="rounded-xl border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted/50">
                  Play Again
                </button>
              </div>
            </div>
          )}

          {/* Dead */}
          {ui.phase === 'dead' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/85 backdrop-blur-sm">
              <p className="text-2xl font-bold text-foreground">Game Over</p>
              <p className="text-sm text-muted-foreground">Score: {ui.score}</p>
              <button type="button" onClick={() => launch(level)}
                className="mt-3 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-6 rounded opacity-70" style={{ background: '#818cf8' }} />
          Low (≤10 pts) · 5 pts · 1 hit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-6 rounded" style={{ background: '#818cf8' }} />
          Med (11–50) · 10 pts · 1 hit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-6 rounded border border-white/20" style={{ background: '#818cf8' }} />
          High (50+) · 25 pts · 2 hits
        </span>
        <span className="ml-auto">Ball speed increases with each brick · paddle color shows velocity</span>
      </div>
    </div>
  )
}
