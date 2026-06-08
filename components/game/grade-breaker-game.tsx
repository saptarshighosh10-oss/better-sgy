'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSchoolYears } from '@/lib/use-grades'
import { useAppStore } from '@/store/use-app-store'
import type { Assignment, Course } from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────

type Phase    = 'idle' | 'active' | 'won' | 'dead'
type LevelNum = 1 | 2 | 3
type Tier     = 'low' | 'med' | 'high'
type Shape    = 'rect' | 'pill' | 'diamond'
type PUpType  = 'wide' | 'slow' | 'multi' | 'fire' | 'shrink'

type GameBrick = {
  id: string; name: string; course: string
  color: string; tier: Tier; shape: Shape
  hp: number; maxHp: number; pts: number
  x: number; y: number; w: number; h: number
  alive: boolean; hitFlash: number
}

type Ball = { x: number; y: number; vx: number; vy: number }

type PowerUp = {
  id: string; type: PUpType
  x: number; y: number; vy: number; life: number
}

type Particle = {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; r: number
}

type FloatText = {
  x: number; y: number; vy: number
  life: number; maxLife: number; text: string; color: string
}

type Star = { x: number; y: number; r: number; alpha: number; phase: number }

// ── Constants ──────────────────────────────────────────────────────────────

const CANVAS_H  = 560
const BALL_R    = 7
const PAD_H     = 12
const PAD_W     = 120
const PAD_FLOOR = 32
const BRICK_H   = 38
const BRICK_GAP = 7
const BRICK_TOP = 22
const PUP_W     = 28
const PUP_H     = 22

const TIER_CFG: Record<Tier, { maxHp: number; pts: number }> = {
  low:  { maxHp: 1, pts: 5  },
  med:  { maxHp: 1, pts: 10 },
  high: { maxHp: 2, pts: 25 },
}

const SHAPE_BY_TIER: Record<Tier, Shape> = {
  low: 'rect', med: 'pill', high: 'diamond',
}

const LEVEL_DEFS = {
  1: {
    label: 'Missing Work', sub: 'Your overdue assignments', badge: '🔴',
    cols: 3, cap: 15,
    baseSpeed: 5.2, speedPerHit: 0.32, maxSpeed: 18,
    filter: (a: Assignment) => a.status === 'missing' || a.status === 'late',
  },
  2: {
    label: 'Incomplete', sub: 'Everything not yet graded', badge: '🟡',
    cols: 4, cap: 20,
    baseSpeed: 6.5, speedPerHit: 0.42, maxSpeed: 23,
    filter: (a: Assignment) => a.score === null && a.status !== 'excused',
  },
  3: {
    label: 'Full Semester', sub: 'Every assignment — chaos mode', badge: '⚡',
    cols: 5, cap: 30,
    baseSpeed: 8.0, speedPerHit: 0.55, maxSpeed: 30,
    filter: () => true,
  },
} as const

const PUP_META: Record<PUpType, { icon: string; label: string; color: string; good: boolean }> = {
  wide:   { icon: '⬛', label: 'WIDE PAD',   color: '#4ade80', good: true  },
  slow:   { icon: '❄',  label: 'SLOW BALL',  color: '#38bdf8', good: true  },
  multi:  { icon: '✦',  label: 'MULTI BALL', color: '#c084fc', good: true  },
  fire:   { icon: '🔥', label: 'FIREBALL',   color: '#fb923c', good: true  },
  shrink: { icon: '💀', label: 'SHRINK!',    color: '#f87171', good: false },
}

const PUP_TYPES:   PUpType[] = ['wide', 'slow', 'multi', 'fire', 'shrink']
const PUP_WEIGHTS: number[]  = [3, 3, 2, 2, 2]

const EFFECT_FRAMES = { wide: 420, slow: 300, fire: 360, shrink: 300 } as const

// ── Draw helpers ───────────────────────────────────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const R = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + R, y)
  ctx.lineTo(x + w - R, y);   ctx.arcTo(x + w, y,     x + w, y + R,     R)
  ctx.lineTo(x + w, y + h - R); ctx.arcTo(x + w, y + h, x + w - R, y + h, R)
  ctx.lineTo(x + R, y + h);   ctx.arcTo(x, y + h,     x, y + h - R,     R)
  ctx.lineTo(x, y + R);       ctx.arcTo(x, y,          x + R, y,         R)
  ctx.closePath()
}

function pathDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const mx = x + w / 2, my = y + h / 2
  ctx.beginPath()
  ctx.moveTo(mx, y + 3)
  ctx.lineTo(x + w - 3, my)
  ctx.lineTo(mx, y + h - 3)
  ctx.lineTo(x + 3, my)
  ctx.closePath()
}

function pathPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  rr(ctx, x, y, w, h, h / 2)
}

function brickPath(ctx: CanvasRenderingContext2D, b: GameBrick) {
  if (b.shape === 'diamond') pathDiamond(ctx, b.x, b.y, b.w, b.h)
  else if (b.shape === 'pill') pathPill(ctx, b.x, b.y, b.w, b.h)
  else rr(ctx, b.x, b.y, b.w, b.h, 8)
}

function drawBrick(ctx: CanvasRenderingContext2D, b: GameBrick) {
  const damaged  = b.maxHp > 1 && b.hp < b.maxHp
  const flashing = b.hitFlash > 0

  ctx.save()

  // Fill
  if (flashing) {
    ctx.fillStyle   = '#ffffff'
    ctx.globalAlpha = 0.95
  } else if (damaged) {
    ctx.fillStyle   = b.color
    ctx.globalAlpha = 0.38
  } else {
    ctx.fillStyle   = b.color
    ctx.globalAlpha = b.tier === 'low' ? 0.62 : b.tier === 'high' ? 0.90 : 0.75
  }
  brickPath(ctx, b); ctx.fill()

  // High-tier glow ring
  if (b.tier === 'high' && !damaged && !flashing) {
    ctx.globalAlpha = 0.45
    ctx.strokeStyle = b.color
    ctx.lineWidth   = 2
    ctx.shadowColor = b.color
    ctx.shadowBlur  = 10
    brickPath(ctx, b); ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Damaged cracks
  if (damaged) {
    ctx.globalAlpha   = 0.55
    ctx.strokeStyle   = '#ffffff'
    ctx.lineWidth     = 1.5
    ctx.setLineDash([4, 3])
    brickPath(ctx, b); ctx.stroke()
    ctx.setLineDash([])
  }

  // Text — skip interior text on diamonds (too cramped)
  ctx.globalAlpha  = 1
  ctx.fillStyle    = flashing ? '#111111' : '#ffffff'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  if (b.shape !== 'diamond') {
    ctx.font = 'bold 11px -apple-system,system-ui,sans-serif'
    ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 - 7, b.w - 14)
    ctx.globalAlpha = flashing ? 0.5 : 0.55
    ctx.font = '10px -apple-system,system-ui,sans-serif'
    ctx.fillText(b.course, b.x + b.w / 2, b.y + b.h / 2 + 8, b.w - 14)
  } else {
    // Diamond: tiny name only
    ctx.font = 'bold 9px -apple-system,system-ui,sans-serif'
    ctx.globalAlpha = flashing ? 0.5 : 0.7
    ctx.fillText(b.name.slice(0, 12), b.x + b.w / 2, b.y + b.h / 2, b.w - 8)
  }

  // HP pip dot (high-tier)
  if (b.tier === 'high' && b.maxHp > 1 && !flashing) {
    ctx.globalAlpha = 0.9
    ctx.fillStyle   = b.hp > 1 ? '#fbbf24' : '#dc2626'
    ctx.shadowColor = b.hp > 1 ? '#fbbf24' : '#dc2626'
    ctx.shadowBlur  = 5
    ctx.beginPath()
    ctx.arc(b.x + b.w - 8, b.y + 8, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

// ── Brick builder ──────────────────────────────────────────────────────────

function getTier(pts: number): Tier {
  if (pts <= 10) return 'low'
  if (pts <= 50) return 'med'
  return 'high'
}

function buildBricks(courses: Course[], level: LevelNum, cw: number): GameBrick[] {
  const def   = LEVEL_DEFS[level]
  const items: { assignment: Assignment; course: Course }[] = []

  for (const course of courses)
    for (const cat of course.categories)
      for (const a of cat.assignments)
        if (def.filter(a)) items.push({ assignment: a, course })

  items.sort((a, b) => {
    const p = (s: string) => s === 'missing' ? 0 : s === 'late' ? 1 : 2
    const d = p(a.assignment.status) - p(b.assignment.status)
    return d !== 0 ? d : new Date(a.assignment.dueDate).getTime() - new Date(b.assignment.dueDate).getTime()
  })

  const capped = items.slice(0, def.cap)
  const cols   = Math.min(def.cols, capped.length)
  if (!cols) return []
  const bw = (cw - BRICK_GAP * (cols + 1)) / cols

  return capped.map((item, i) => {
    const tier = getTier(item.assignment.pointsPossible)
    const { maxHp, pts } = TIER_CFG[tier]
    return {
      id:    item.assignment.id,
      name:  item.assignment.name.length > 26 ? item.assignment.name.slice(0, 25) + '…' : item.assignment.name,
      course: item.course.name,
      color:  item.course.color.startsWith('#') ? item.course.color : '#6366f1',
      tier, shape: SHAPE_BY_TIER[tier],
      hp: maxHp, maxHp, pts,
      x: BRICK_GAP + (i % cols) * (bw + BRICK_GAP),
      y: BRICK_TOP + Math.floor(i / cols) * (BRICK_H + BRICK_GAP),
      w: bw, h: BRICK_H,
      alive: true, hitFlash: 0,
    }
  })
}

// ── Power-up picker ────────────────────────────────────────────────────────

function pickPupType(): PUpType {
  const total = PUP_WEIGHTS.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < PUP_TYPES.length; i++) { r -= PUP_WEIGHTS[i]; if (r <= 0) return PUP_TYPES[i] }
  return 'wide'
}

// ── Stars ──────────────────────────────────────────────────────────────────

function makeStars(cw: number): Star[] {
  return Array.from({ length: 60 }, () => ({
    x: Math.random() * cw, y: Math.random() * CANVAS_H,
    r: Math.random() * 1.3 + 0.2,
    alpha: Math.random() * 0.35 + 0.08,
    phase: Math.random() * Math.PI * 2,
  }))
}

// ── Component ──────────────────────────────────────────────────────────────

export function GradeBreakerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const [level, setLevel] = useState<LevelNum>(1)

  const { schoolYears } = useSchoolYears()
  const selectedYearId  = useAppStore((s) => s.selectedYearId)
  const selectedSemId   = useAppStore((s) => s.selectedSemesterId)
  const year     = schoolYears.find((y) => y.id === selectedYearId) ?? schoolYears[0]
  const semester = year?.semesters.find((s) => s.id === selectedSemId) ?? year?.semesters[0]
  const courses  = semester?.courses ?? []

  const G = useRef<{
    phase: Phase; bricks: GameBrick[]
    ball: Ball; ball2: Ball | null
    padX: number; padW: number
    lives: number; score: number
    bricksHit: number; currentSpeed: number
    level: LevelNum; w: number
    powerUps: PowerUp[]; particles: Particle[]; floatTexts: FloatText[]; stars: Star[]
    effects: { wide: number; slow: number; fire: number; shrink: number }
    lastPupLabel: string; lastPupTimer: number; lastPupColor: string
    frame: number
  }>({
    phase: 'idle', bricks: [], ball: { x: 0, y: 0, vx: 0, vy: 0 }, ball2: null,
    padX: 0, padW: PAD_W, lives: 3, score: 0, bricksHit: 0,
    currentSpeed: LEVEL_DEFS[1].baseSpeed, level: 1, w: 0,
    powerUps: [], particles: [], floatTexts: [], stars: [],
    effects: { wide: 0, slow: 0, fire: 0, shrink: 0 },
    lastPupLabel: '', lastPupTimer: 0, lastPupColor: '#fff',
    frame: 0,
  })
  const rafRef = useRef(0)

  const [ui, setUi] = useState<{
    phase: Phase; lives: number; score: number
    bricksLeft: number; totalBricks: number; speed: number
    effects: { wide: number; slow: number; fire: number; shrink: number }
    lastPupLabel: string; lastPupColor: string
  }>({
    phase: 'idle', lives: 3, score: 0, bricksLeft: 0, totalBricks: 0,
    speed: LEVEL_DEFS[1].baseSpeed,
    effects: { wide: 0, slow: 0, fire: 0, shrink: 0 },
    lastPupLabel: '', lastPupColor: '#fff',
  })

  const sync = useCallback(() => {
    const g = G.current
    setUi({
      phase: g.phase, lives: g.lives, score: g.score,
      bricksLeft: g.bricks.filter(b => b.alive).length,
      totalBricks: g.bricks.length,
      speed: parseFloat(g.currentSpeed.toFixed(1)),
      effects: { ...g.effects },
      lastPupLabel: g.lastPupLabel,
      lastPupColor: g.lastPupColor,
    })
  }, [])

  const launch = useCallback((lvl: LevelNum) => {
    const g  = G.current
    const cw = g.w || 600
    const def = LEVEL_DEFS[lvl]
    Object.assign(g, {
      level: lvl,
      bricks: buildBricks(courses, lvl, cw),
      lives: 3, score: 0, bricksHit: 0,
      currentSpeed: def.baseSpeed,
      padX: cw / 2 - PAD_W / 2, padW: PAD_W,
      powerUps: [], particles: [], floatTexts: [],
      ball2: null,
      effects: { wide: 0, slow: 0, fire: 0, shrink: 0 },
      lastPupLabel: '', lastPupTimer: 0,
    })
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.7
    g.ball  = { x: cw / 2, y: CANVAS_H - PAD_FLOOR - 55,
                vx: Math.cos(a) * def.baseSpeed, vy: Math.sin(a) * def.baseSpeed }
    g.phase = 'active'
    sync()
  }, [courses, sync])

  // ── Game loop ──────────────────────────────────────────────────────────────
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
      if (!G.current.stars.length) G.current.stars = makeStars(w)
    })
    ro.observe(wrap)

    const onMouse = (e: MouseEvent) => {
      if (G.current.phase !== 'active') return
      const rect = canvas.getBoundingClientRect()
      const pw   = G.current.padW
      G.current.padX = Math.max(0, Math.min(G.current.w - pw, e.clientX - rect.left - pw / 2))
    }
    const onTouch = (e: TouchEvent) => {
      if (G.current.phase !== 'active') return
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const pw   = G.current.padW
      G.current.padX = Math.max(0, Math.min(G.current.w - pw, e.touches[0].clientX - rect.left - pw / 2))
    }
    canvas.addEventListener('mousemove', onMouse)
    canvas.addEventListener('touchmove', onTouch, { passive: false })

    // ── Helpers inside loop ─────────────────────────────────────────────────

    function spawnParticles(x: number, y: number, color: string, n = 12) {
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2
        const spd   = Math.random() * 3.5 + 0.8
        G.current.particles.push({
          x, y,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1.2,
          life: 35 + Math.floor(Math.random() * 20), maxLife: 55,
          color, r: Math.random() * 3 + 1.5,
        })
      }
    }

    function spawnFloat(x: number, y: number, text: string, color: string) {
      G.current.floatTexts.push({ x, y, vy: -1.4, life: 42, maxLife: 42, text, color })
    }

    function trySpawnPup(x: number, y: number) {
      if (Math.random() > 0.38) return
      G.current.powerUps.push({
        id: Math.random().toString(36).slice(2),
        type: pickPupType(),
        x: x - PUP_W / 2, y, vy: 2.0, life: 240,
      })
    }

    function applyPup(type: PUpType) {
      const g    = G.current
      const meta = PUP_META[type]
      g.lastPupLabel = meta.label
      g.lastPupColor = meta.color
      g.lastPupTimer = 100

      if (type === 'wide')   { g.effects.wide   = EFFECT_FRAMES.wide;   g.effects.shrink = 0 }
      if (type === 'shrink') { g.effects.shrink = EFFECT_FRAMES.shrink; g.effects.wide   = 0 }
      if (type === 'slow')   g.effects.slow = EFFECT_FRAMES.slow
      if (type === 'fire')   g.effects.fire = EFFECT_FRAMES.fire
      if (type === 'multi' && !g.ball2) {
        const b   = g.ball
        const spd = g.currentSpeed
        const ang = Math.atan2(-b.vy, b.vx) + (Math.random() - 0.5) * 1.0
        g.ball2   = { x: b.x, y: b.y, vx: Math.cos(ang) * spd, vy: -Math.abs(Math.sin(ang) * spd) }
      }
      sync()
    }

    // ── Physics for one ball; returns false if it should be removed ─────────
    function stepBall(b: Ball, isMain: boolean, g: typeof G.current, cw: number): boolean {
      const def = LEVEL_DEFS[g.level]

      // Slow: cap speed
      if (g.effects.slow > 0) {
        const spd    = Math.hypot(b.vx, b.vy)
        const capSpd = def.baseSpeed * 0.62
        if (spd > capSpd) { b.vx = (b.vx / spd) * capSpd; b.vy = (b.vy / spd) * capSpd }
      }

      b.x += b.vx; b.y += b.vy

      if (b.x - BALL_R < 0)  { b.x = BALL_R;      b.vx =  Math.abs(b.vx) }
      if (b.x + BALL_R > cw) { b.x = cw - BALL_R; b.vx = -Math.abs(b.vx) }
      if (b.y - BALL_R < 0)  { b.y = BALL_R;      b.vy =  Math.abs(b.vy) }

      const py = CANVAS_H - PAD_FLOOR
      const pw = g.padW
      if (b.vy > 0 && b.y + BALL_R >= py && b.y + BALL_R <= py + PAD_H + 5 &&
          b.x >= g.padX && b.x <= g.padX + pw) {
        const hit = (b.x - (g.padX + pw / 2)) / (pw / 2)
        const ang = hit * (Math.PI / 3.2)
        const spd = g.currentSpeed
        b.vx = Math.sin(ang) * spd
        b.vy = -Math.cos(ang) * spd
        b.y  = py - BALL_R - 1
      }

      if (b.y - BALL_R > CANVAS_H) {
        if (!isMain) return false
        g.lives--
        if (g.ball2) { g.ball = g.ball2; g.ball2 = null; return true }
        if (g.lives <= 0) { g.phase = 'dead'; sync(); return true }
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
        g.padX = cw / 2 - PAD_W / 2
        b.x = cw / 2; b.y = CANVAS_H - PAD_FLOOR - 55
        b.vx = Math.cos(ang) * g.currentSpeed; b.vy = Math.sin(ang) * g.currentSpeed
        sync()
      }
      return true
    }

    // ── Brick collision for one ball ────────────────────────────────────────
    function checkBricks(b: Ball, g: typeof G.current) {
      const def = LEVEL_DEFS[g.level]
      for (const brick of g.bricks) {
        if (!brick.alive || brick.hitFlash > 0) continue
        if (b.x + BALL_R > brick.x && b.x - BALL_R < brick.x + brick.w &&
            b.y + BALL_R > brick.y && b.y - BALL_R < brick.y + brick.h) {

          const dmg = g.effects.fire > 0 ? brick.hp : 1
          brick.hp -= dmg
          brick.hitFlash = 6

          if (brick.hp <= 0) {
            brick.alive = false
            g.score    += brick.pts
            g.bricksHit++
            g.currentSpeed = Math.min(g.currentSpeed + def.speedPerHit, def.maxSpeed)
            const spd = g.currentSpeed, len = Math.hypot(b.vx, b.vy)
            if (len > 0) { b.vx = (b.vx / len) * spd; b.vy = (b.vy / len) * spd }
            spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 14)
            spawnFloat(brick.x + brick.w / 2, brick.y, `+${brick.pts}`, brick.color)
            trySpawnPup(brick.x + brick.w / 2, brick.y + brick.h / 2)
            sync()
          }

          const oL = b.x + BALL_R - brick.x, oR = brick.x + brick.w - (b.x - BALL_R)
          const oT = b.y + BALL_R - brick.y, oB = brick.y + brick.h - (b.y - BALL_R)
          const mn = Math.min(oL, oR, oT, oB)
          if (mn === oT || mn === oB) b.vy = -b.vy; else b.vx = -b.vx
          break
        }
      }
    }

    // ── Main tick ───────────────────────────────────────────────────────────
    function tick() {
      const g  = G.current
      const cw = g.w
      rafRef.current = requestAnimationFrame(tick)
      if (!cw) return
      g.frame++

      // ── Update ──────────────────────────────────────────────────────────
      if (g.phase === 'active') {
        // Effect timers
        if (g.effects.wide   > 0) g.effects.wide--
        if (g.effects.slow   > 0) g.effects.slow--
        if (g.effects.fire   > 0) g.effects.fire--
        if (g.effects.shrink > 0) g.effects.shrink--
        if (g.lastPupTimer   > 0) { g.lastPupTimer--; if (g.lastPupTimer === 0) { g.lastPupLabel = ''; sync() } }

        g.padW = g.effects.shrink > 0 ? PAD_W * 0.58
               : g.effects.wide   > 0 ? PAD_W * 1.65
               : PAD_W

        stepBall(g.ball, true, g, cw)
        if (g.ball2 && !stepBall(g.ball2, false, g, cw)) g.ball2 = null

        checkBricks(g.ball, g)
        if (g.ball2) checkBricks(g.ball2, g)

        // Power-up physics + catch
        const py = CANVAS_H - PAD_FLOOR
        g.powerUps = g.powerUps.filter(pu => {
          pu.y += pu.vy; pu.life--
          if (pu.y + PUP_H >= py && pu.y <= py + PAD_H &&
              pu.x + PUP_W >= g.padX && pu.x <= g.padX + g.padW) {
            applyPup(pu.type); return false
          }
          return pu.life > 0 && pu.y < CANVAS_H + 20
        })

        // Particles
        g.particles = g.particles.filter(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.life--; return p.life > 0
        })

        // Float texts
        g.floatTexts = g.floatTexts.filter(f => { f.y += f.vy; f.life--; return f.life > 0 })

        // Win check
        if (g.bricks.length > 0 && !g.bricks.some(b => b.alive) && g.phase === 'active') {
          g.phase = 'won'; sync()
        }
      }

      // ── Render ──────────────────────────────────────────────────────────

      // Dark background
      ctx.fillStyle = '#0a0a0e'
      ctx.fillRect(0, 0, cw, CANVAS_H)

      // Subtle grid lines
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth   = 1
      for (let x = 0; x < cw; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke()
      }
      for (let y = 0; y < CANVAS_H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke()
      }
      ctx.restore()

      // Stars
      for (const s of g.stars) {
        s.phase += 0.025
        const a = s.alpha * (0.55 + 0.45 * Math.sin(s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
      }

      // Bricks
      for (const b of g.bricks) if (b.alive) drawBrick(ctx, b)

      // Particles
      for (const p of g.particles) {
        const a = p.life / p.maxLife
        ctx.save()
        ctx.globalAlpha = a
        ctx.fillStyle   = p.color
        ctx.shadowColor = p.color; ctx.shadowBlur = 5
        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(0.5, p.r * a), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Float texts
      for (const f of g.floatTexts) {
        const a = f.life / f.maxLife
        ctx.save()
        ctx.globalAlpha  = a
        ctx.fillStyle    = f.color
        ctx.shadowColor  = f.color; ctx.shadowBlur = 8
        ctx.font         = 'bold 13px -apple-system,system-ui,sans-serif'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(f.text, f.x, f.y)
        ctx.restore()
      }

      // Power-ups
      for (const pu of g.powerUps) {
        const meta = PUP_META[pu.type]
        const a    = Math.min(1, pu.life / 20)
        ctx.save()
        ctx.globalAlpha = a
        ctx.fillStyle   = meta.color
        ctx.shadowColor = meta.color; ctx.shadowBlur = 12
        rr(ctx, pu.x, pu.y, PUP_W, PUP_H, 5); ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle    = '#ffffff'
        ctx.font         = '13px -apple-system,system-ui,sans-serif'
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(meta.icon, pu.x + PUP_W / 2, pu.y + PUP_H / 2)
        ctx.restore()
      }

      if (g.phase === 'active') {
        const def        = LEVEL_DEFS[g.level]
        const speedRatio = Math.min(1, (g.currentSpeed - def.baseSpeed) / (def.maxSpeed - def.baseSpeed))
        const auraRgb    = speedRatio < 0.33 ? '129,140,248' : speedRatio < 0.66 ? '251,191,36' : '239,68,68'
        const py         = CANVAS_H - PAD_FLOOR
        const pw         = g.padW

        // Paddle
        ctx.save()
        ctx.fillStyle   = `rgba(${auraRgb},0.88)`
        ctx.shadowColor = `rgba(${auraRgb},0.6)`
        ctx.shadowBlur  = 12 + speedRatio * 24
        rr(ctx, g.padX, py, pw, PAD_H, 6); ctx.fill()
        // Wide/shrink tint overlay
        if (g.effects.wide > 0) {
          ctx.globalAlpha = 0.25; ctx.fillStyle = '#4ade80'
          ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 16
          rr(ctx, g.padX - 2, py - 2, pw + 4, PAD_H + 4, 7); ctx.fill()
        }
        if (g.effects.shrink > 0) {
          ctx.globalAlpha = 0.25; ctx.fillStyle = '#f87171'
          ctx.shadowColor = '#f87171'; ctx.shadowBlur = 12
          rr(ctx, g.padX, py, pw, PAD_H, 6); ctx.fill()
        }
        ctx.restore()

        // Main ball
        ctx.save()
        ctx.beginPath(); ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2)
        ctx.fillStyle   = g.effects.fire > 0 ? '#fb923c' : '#ffffff'
        ctx.shadowColor = g.effects.fire > 0 ? '#f97316' : `rgba(${auraRgb},0.9)`
        ctx.shadowBlur  = g.effects.fire > 0 ? 24 : 14 + speedRatio * 14
        ctx.fill()
        ctx.restore()

        // Second ball (purple)
        if (g.ball2) {
          ctx.save()
          ctx.beginPath(); ctx.arc(g.ball2.x, g.ball2.y, BALL_R * 0.85, 0, Math.PI * 2)
          ctx.fillStyle = '#c084fc'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14
          ctx.fill()
          ctx.restore()
        }
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

  // ── HUD ────────────────────────────────────────────────────────────────────

  const def      = LEVEL_DEFS[level]
  const speedPct = Math.min(100, ((ui.speed - def.baseSpeed) / (def.maxSpeed - def.baseSpeed)) * 100)
  const activeEfx = (Object.entries(ui.effects) as [keyof typeof ui.effects, number][]).filter(([, v]) => v > 0)

  return (
    <div className="flex flex-col gap-4">

      {/* Level selector */}
      <div className="flex gap-2">
        {([1, 2, 3] as LevelNum[]).map((lvl) => (
          <button key={lvl} type="button" onClick={() => setLevel(lvl)}
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
                <p className="text-xs font-semibold leading-tight">Level {lvl} — {LEVEL_DEFS[lvl].label}</p>
                <p className="mt-0.5 text-[10px] opacity-70 leading-tight">{LEVEL_DEFS[lvl].sub}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Game canvas card */}
      <div ref={wrapRef} className="overflow-hidden rounded-xl border border-border">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-3">

            {/* Lives — muted hearts, easy on eyes */}
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <svg key={i} viewBox="0 0 24 24" width="14" height="14"
                  fill={i < ui.lives ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="2"
                  className={i < ui.lives ? 'text-rose-700 dark:text-rose-900/80' : 'text-foreground/12'}
                  aria-hidden="true"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              ))}
            </div>

            {/* Speed bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">SPD</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/50">
                <div className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${speedPct}%`,
                    background: speedPct < 33 ? '#818cf8' : speedPct < 66 ? '#fbbf24' : '#ef4444',
                  }}
                />
              </div>
              <span className="text-[10px] font-semibold tabular-nums text-foreground">{ui.speed.toFixed(1)}</span>
            </div>

            {/* Active effects */}
            {activeEfx.map(([key, frames]) => {
              const meta = PUP_META[key as PUpType]
              return (
                <span key={key} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  style={{ borderColor: meta.color + '60', color: meta.color, background: meta.color + '18' }}>
                  {meta.icon} {meta.label} {Math.ceil(frames / 60)}s
                </span>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            {/* Power-up catch flash */}
            {ui.lastPupLabel && (
              <span className="text-[11px] font-bold animate-pulse"
                style={{ color: ui.lastPupColor }}>
                {ui.lastPupLabel}!
              </span>
            )}

            {ui.phase === 'active' && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {ui.bricksLeft}/{ui.totalBricks}
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
        <div className="relative bg-[#0a0a0e]">
          <canvas ref={canvasRef} className="block w-full" style={{ height: CANVAS_H }} />

          {/* Idle overlay */}
          {ui.phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div className="text-center">
                <p className="text-xl font-bold text-white/90">Grade Breaker</p>
                <p className="mt-1 text-sm text-white/50">{def.badge} {def.label} — {def.sub}</p>
                <div className="mt-3 flex justify-center gap-5 text-[11px] text-white/40">
                  <span>⬜ Low · rect · 1 hit</span>
                  <span>💊 Med · capsule · 1 hit</span>
                  <span>◆ High · diamond · 2 hits</span>
                </div>
                <div className="mt-1.5 flex justify-center gap-5 text-[11px] text-white/30">
                  <span>⬛ Wide pad</span>
                  <span>❄ Slow ball</span>
                  <span>✦ Multi ball</span>
                  <span>🔥 Fireball</span>
                  <span>💀 Shrink!</span>
                </div>
              </div>
              <button type="button" onClick={() => launch(level)}
                className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-95 transition-all">
                Launch Ball
              </button>
            </div>
          )}

          {/* Won overlay */}
          {ui.phase === 'won' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">All Cleared! 🎉</p>
              <p className="text-base font-semibold text-emerald-400">Score: {ui.score}</p>
              <p className="text-xs text-white/40">Now go actually do those assignments</p>
              <div className="mt-2 flex gap-2">
                {level < 3 && (
                  <button type="button"
                    onClick={() => { const n = (level + 1) as LevelNum; setLevel(n); launch(n) }}
                    className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                    Next Level →
                  </button>
                )}
                <button type="button" onClick={() => launch(level)}
                  className="rounded-xl border border-white/20 bg-white/5 px-5 py-2 text-sm font-medium text-white hover:bg-white/10">
                  Play Again
                </button>
              </div>
            </div>
          )}

          {/* Dead overlay */}
          {ui.phase === 'dead' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">Game Over</p>
              <p className="text-sm text-white/50">Score: {ui.score}</p>
              <button type="button" onClick={() => launch(level)}
                className="mt-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
        <span>Speed ramps hard — {def.speedPerHit.toFixed(2)} per brick, max {def.maxSpeed}</span>
        <span className="ml-auto">Catch falling power-ups with your paddle</span>
      </div>
    </div>
  )
}
