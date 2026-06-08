'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { MissingItem } from './missing-section'

type Phase = 'idle' | 'active' | 'won' | 'dead'
type Ball  = { x: number; y: number; vx: number; vy: number }
type Brick = {
  x: number; y: number; w: number; h: number
  color: string; label: string; sub: string; alive: boolean
}

const H         = 380
const BALL_R    = 7
const PAD_H     = 12
const PAD_W     = 116
const PAD_FLOOR = 28    // distance from bottom of canvas to top of paddle
const BRICK_H   = 40
const BRICK_GAP = 8
const COLS      = 3
const INIT_SPD  = 4.6
const MAX_ITEMS = 9     // cap bricks so the area doesn't overflow

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

export function GradeBreaker({ missingItems }: { missingItems: MissingItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // All mutable game state in a ref — no re-render during the game loop
  const G = useRef({
    phase: 'idle' as Phase,
    bricks: [] as Brick[],
    ball: { x: 0, y: 0, vx: 0, vy: 0 } as Ball,
    padX: 0,
    lives: 3,
    score: 0,
    w: 0,
  })
  const rafRef = useRef(0)

  // React state only for the UI overlay (header + end screens)
  const [ui, setUi] = useState<{ phase: Phase; lives: number; score: number }>({
    phase: 'idle', lives: 3, score: 0,
  })

  // Stable sync — reads from the ref, pushes to React
  const sync = useCallback(() => {
    const { phase, lives, score } = G.current
    setUi({ phase, lives, score })
  }, [])

  const items = missingItems.slice(0, MAX_ITEMS)

  const buildBricks = useCallback((cw: number): Brick[] => {
    const cols = Math.min(COLS, items.length)
    if (cols === 0) return []
    const bw = (cw - BRICK_GAP * (cols + 1)) / cols
    return items.map((item, i) => ({
      x: BRICK_GAP + (i % cols) * (bw + BRICK_GAP),
      y: 20 + Math.floor(i / cols) * (BRICK_H + BRICK_GAP),
      w: bw,
      h: BRICK_H,
      color: item.courseColor?.startsWith('#') ? item.courseColor : '#6366f1',
      label: item.name.length > 30 ? item.name.slice(0, 29) + '…' : item.name,
      sub: item.courseName,
      alive: true,
    }))
  }, [items])

  const launch = useCallback(() => {
    const g = G.current
    const cw = g.w
    g.bricks = buildBricks(cw)
    g.lives  = 3
    g.score  = 0
    g.padX   = cw / 2 - PAD_W / 2
    const a  = -Math.PI / 2 + (Math.random() - 0.5) * 0.7
    g.ball   = { x: cw / 2, y: H - PAD_FLOOR - 50, vx: Math.cos(a) * INIT_SPD, vy: Math.sin(a) * INIT_SPD }
    g.phase  = 'active'
    sync()
  }, [buildBricks, sync])

  // Canvas setup + game loop — runs once on mount
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    // Keep canvas pixel size in sync with layout width
    const ro = new ResizeObserver(() => {
      const w = Math.floor(wrap.clientWidth)
      canvas.width  = w
      canvas.height = H
      G.current.w   = w
    })
    ro.observe(wrap)

    // Paddle control
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

      // ── Physics ──────────────────────────────────────────
      if (g.phase === 'active') {
        const b = g.ball

        b.x += b.vx
        b.y += b.vy

        // Side walls + ceiling
        if (b.x - BALL_R < 0)  { b.x = BALL_R;       b.vx =  Math.abs(b.vx) }
        if (b.x + BALL_R > cw) { b.x = cw - BALL_R;  b.vx = -Math.abs(b.vx) }
        if (b.y - BALL_R < 0)  { b.y = BALL_R;       b.vy =  Math.abs(b.vy) }

        // Paddle
        const py = H - PAD_FLOOR
        if (
          b.vy > 0 &&
          b.y + BALL_R >= py &&
          b.y + BALL_R <= py + PAD_H + 4 &&
          b.x >= g.padX && b.x <= g.padX + PAD_W
        ) {
          const hit = (b.x - (g.padX + PAD_W / 2)) / (PAD_W / 2) // -1 to 1
          const a   = hit * (Math.PI / 3.2)                        // max ~56°
          const spd = Math.hypot(b.vx, b.vy)
          b.vx = Math.sin(a) * spd
          b.vy = -Math.cos(a) * spd
          b.y  = py - BALL_R - 1
        }

        // Ball escaped below
        if (b.y - BALL_R > H) {
          g.lives--
          if (g.lives <= 0) {
            g.phase = 'dead'
            sync()
          } else {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6
            g.padX  = cw / 2 - PAD_W / 2
            b.x = cw / 2; b.y = H - PAD_FLOOR - 50
            b.vx = Math.cos(a) * INIT_SPD; b.vy = Math.sin(a) * INIT_SPD
            sync()
          }
        }

        // Brick collision — single brick per frame (prevents double-bounce)
        let anyAlive = false
        for (const brick of g.bricks) {
          if (!brick.alive) continue
          anyAlive = true
          if (
            b.x + BALL_R > brick.x && b.x - BALL_R < brick.x + brick.w &&
            b.y + BALL_R > brick.y && b.y - BALL_R < brick.y + brick.h
          ) {
            brick.alive = false
            g.score += 10
            sync()
            // Minimal-overlap side determines bounce axis
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
          g.phase = 'won'
          sync()
        }
      }

      // ── Render ───────────────────────────────────────────
      ctx.clearRect(0, 0, cw, H)

      // Bricks
      for (const b of g.bricks) {
        if (!b.alive) continue
        ctx.save()
        ctx.globalAlpha = 0.88
        ctx.fillStyle   = b.color
        rr(ctx, b.x, b.y, b.w, b.h, 8)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.lineWidth   = 1
        rr(ctx, b.x, b.y, b.w, b.h, 8)
        ctx.stroke()
        // Assignment name
        ctx.fillStyle     = '#fff'
        ctx.font          = 'bold 11px -apple-system,system-ui,sans-serif'
        ctx.textAlign     = 'center'
        ctx.textBaseline  = 'middle'
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 - 7, b.w - 14)
        // Course name
        ctx.globalAlpha = 0.65
        ctx.font = '10px -apple-system,system-ui,sans-serif'
        ctx.fillText(b.sub, b.x + b.w / 2, b.y + b.h / 2 + 8, b.w - 14)
        ctx.restore()
      }

      if (g.phase === 'active') {
        // Paddle
        ctx.save()
        ctx.fillStyle   = '#818cf8'
        ctx.shadowColor = 'rgba(129,140,248,0.5)'
        ctx.shadowBlur  = 14
        rr(ctx, g.padX, H - PAD_FLOOR, PAD_W, PAD_H, 6)
        ctx.fill()
        ctx.restore()

        // Ball
        ctx.save()
        ctx.beginPath()
        ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2)
        ctx.fillStyle   = '#fff'
        ctx.shadowColor = 'rgba(255,255,255,0.7)'
        ctx.shadowBlur  = 14
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
  }, [sync]) // sync is stable (useCallback + no deps)

  if (items.length === 0) return null

  return (
    <div ref={wrapRef} className="mt-4 overflow-hidden rounded-xl border border-border">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Grade Breaker</span>
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            {items.length} to clear
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Lives */}
          <div className="flex gap-0.5" aria-label={`${ui.lives} lives remaining`}>
            {[0, 1, 2].map((i) => (
              <svg
                key={i} viewBox="0 0 24 24" width="13" height="13"
                fill={i < ui.lives ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="2" aria-hidden="true"
                className={i < ui.lives ? 'text-red-500' : 'text-muted-foreground/25'}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ))}
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-foreground">{ui.score} pts</span>
          {ui.phase !== 'idle' && (
            <button
              type="button" onClick={launch}
              className="text-[11px] text-primary transition-opacity hover:opacity-70"
            >
              Restart
            </button>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div className="relative bg-card">
        <canvas ref={canvasRef} className="block w-full" style={{ height: H }} />

        {/* Idle */}
        {ui.phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Break your missing work</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Move mouse to control the paddle · clear all bricks to win
              </p>
            </div>
            <button
              type="button" onClick={launch}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-95"
            >
              Launch Ball
            </button>
          </div>
        )}

        {/* Win */}
        {ui.phase === 'won' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/85 backdrop-blur-sm">
            <p className="text-xl font-bold text-foreground">All cleared!</p>
            <p className="text-sm font-semibold text-emerald-500">Score: {ui.score}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Now actually submit those assignments</p>
            <button
              type="button" onClick={launch}
              className="mt-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Dead */}
        {ui.phase === 'dead' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/85 backdrop-blur-sm">
            <p className="text-xl font-bold text-foreground">Game Over</p>
            <p className="text-sm text-muted-foreground">Score: {ui.score}</p>
            <button
              type="button" onClick={launch}
              className="mt-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
