import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { ScrapedCourse } from '../../lib/schemas';
import { isMissing, parseMaxGrade } from '../../lib/grade-utils';
import { courseColor } from '../../lib/course-colors';
import { T, getActiveTheme } from '../../lib/theme';
import { GameBackground } from '../GameBackground';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase    = 'idle' | 'active' | 'won' | 'dead';
type LevelNum = 1 | 2 | 3;
type Tier     = 'low' | 'med' | 'high';
type Shape    = 'rect' | 'pill' | 'diamond';
type PUpType  = 'wide' | 'slow' | 'multi' | 'fire' | 'shrink';

interface GameBrick {
  id: string; name: string; course: string;
  color: string; tier: Tier; shape: Shape;
  hp: number; maxHp: number; pts: number;
  x: number; y: number; w: number; h: number;
  alive: boolean; hitFlash: number;
}
interface Ball      { x: number; y: number; vx: number; vy: number; }
interface PowerUp   { id: string; type: PUpType; x: number; y: number; vy: number; life: number; }
interface Particle  { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; r: number; }
interface FloatText { x: number; y: number; vy: number; life: number; maxLife: number; text: string; color: string; }
interface Star      { x: number; y: number; r: number; alpha: number; phase: number; }

interface GradesState { courses: ScrapedCourse[]; }
interface Props { grades: GradesState; }

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_H  = 600;
const BALL_R    = 7;
const PAD_H     = 12;
const PAD_W     = 120;
const PAD_FLOOR = 32;
const BRICK_H   = 36;
const BRICK_GAP = 6;
const BRICK_TOP = 22;
const PUP_W     = 28;
const PUP_H     = 22;

const TIER_CFG: Record<Tier, { maxHp: number; pts: number }> = {
  low:  { maxHp: 1, pts: 5  },
  med:  { maxHp: 1, pts: 10 },
  high: { maxHp: 2, pts: 25 },
};

const SHAPE_BY_TIER: Record<Tier, Shape> = { low: 'rect', med: 'pill', high: 'diamond' };

/** Live check — theme can change mid-session via the nav toggle */
const isMono = () => getActiveTheme() !== 'original';
/** Snapshot for module-level constants (level badges / power-up icon set) */
const IS_MONO = isMono();

const LEVEL_DEFS = {
  1: { label: 'Missing Work',  sub: 'Your overdue assignments',         badge: IS_MONO ? 'Ⅰ' : '🔴', cols: 3, cap: 15, baseSpeed: 5.2, speedPerHit: 0.32, maxSpeed: 18  },
  2: { label: 'To Do',         sub: 'Everything not yet submitted',     badge: IS_MONO ? 'Ⅱ' : '🟡', cols: 4, cap: 20, baseSpeed: 6.5, speedPerHit: 0.42, maxSpeed: 23  },
  3: { label: 'Full Semester', sub: 'Every assignment — chaos mode',    badge: IS_MONO ? 'Ⅲ' : '⚡', cols: 5, cap: 30, baseSpeed: 8.0, speedPerHit: 0.55, maxSpeed: 30  },
} as const;

const PUP_META: Record<PUpType, { icon: string; label: string; color: string }> = {
  wide:   { icon: IS_MONO ? '↔' : '⬛', label: 'WIDE PAD',   color: IS_MONO ? '#ffffff' : '#4ade80' },
  slow:   { icon: IS_MONO ? '⌛' : '❄',  label: 'SLOW BALL',  color: IS_MONO ? '#d4d4d8' : '#38bdf8' },
  multi:  { icon: IS_MONO ? '✦' : '✦',  label: 'MULTI BALL', color: IS_MONO ? '#e4e4e7' : '#c084fc' },
  fire:   { icon: IS_MONO ? '✸' : '🔥', label: 'FIREBALL',   color: IS_MONO ? '#faf9f6' : '#fb923c' },
  shrink: { icon: IS_MONO ? '▼' : '💀', label: 'SHRINK!',    color: IS_MONO ? '#71717a' : '#f87171' },
};

const PUP_TYPES:   PUpType[] = ['wide', 'slow', 'multi', 'fire', 'shrink'];
const PUP_WEIGHTS: number[]  = [3, 3, 2, 2, 2];
const EFFECT_FRAMES = { wide: 420, slow: 300, fire: 360, shrink: 300 } as const;

// Getters so every canvas frame paints with the live theme (theme can switch mid-session)
const C = {
  get bg() { return T.bg; },
  get fg() { return T.text; },
  get card() { return T.card; },
  get cardFg() { return T.text; },
  get primary() { return T.primary; },
  get dest() { return T.red; },
  get border() { return T.border; },
  get mutedFg() { return T.muted; },
};

// ── Draw helpers ───────────────────────────────────────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const R = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + R, y);
  ctx.lineTo(x + w - R, y);    ctx.arcTo(x + w, y,     x + w, y + R,     R);
  ctx.lineTo(x + w, y + h - R); ctx.arcTo(x + w, y + h, x + w - R, y + h, R);
  ctx.lineTo(x + R, y + h);    ctx.arcTo(x, y + h,     x, y + h - R,     R);
  ctx.lineTo(x, y + R);        ctx.arcTo(x, y,          x + R, y,         R);
  ctx.closePath();
}

function pathDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const mx = x + w / 2, my = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(mx, y + 3);
  ctx.lineTo(x + w - 3, my);
  ctx.lineTo(mx, y + h - 3);
  ctx.lineTo(x + 3, my);
  ctx.closePath();
}

function brickPath(ctx: CanvasRenderingContext2D, b: GameBrick) {
  if (b.shape === 'diamond') pathDiamond(ctx, b.x, b.y, b.w, b.h);
  else if (b.shape === 'pill') rr(ctx, b.x, b.y, b.w, b.h, b.h / 2);
  else rr(ctx, b.x, b.y, b.w, b.h, 8);
}

function drawBrick(ctx: CanvasRenderingContext2D, b: GameBrick) {
  const damaged  = b.maxHp > 1 && b.hp < b.maxHp;
  const flashing = b.hitFlash > 0;
  ctx.save();
  if (flashing) {
    ctx.fillStyle   = C.fg;
    ctx.globalAlpha = 0.95;
  } else if (damaged) {
    ctx.fillStyle   = b.color;
    ctx.globalAlpha = 0.38;
  } else {
    ctx.fillStyle   = b.color;
    ctx.globalAlpha = b.tier === 'low' ? 0.62 : b.tier === 'high' ? 0.90 : 0.75;
  }
  brickPath(ctx, b); ctx.fill();
  if (b.tier === 'high' && !damaged && !flashing) {
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = b.color; ctx.lineWidth = 2;
    ctx.shadowColor = b.color; ctx.shadowBlur = 10;
    brickPath(ctx, b); ctx.stroke(); ctx.shadowBlur = 0;
  }
  if (damaged) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = getActiveTheme() === 'mono-light' ? '#1a1a1a' : '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]); brickPath(ctx, b); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.globalAlpha  = 1;
  ctx.fillStyle    = flashing ? C.bg : C.cardFg;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  if (b.shape !== 'diamond') {
    ctx.font = 'bold 10px -apple-system,system-ui,sans-serif';
    ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 - 6, b.w - 12);
    ctx.globalAlpha = flashing ? 0.5 : 0.5;
    ctx.font = '9px -apple-system,system-ui,sans-serif';
    ctx.fillText(b.course, b.x + b.w / 2, b.y + b.h / 2 + 7, b.w - 12);
  } else {
    ctx.font = 'bold 8px -apple-system,system-ui,sans-serif';
    ctx.globalAlpha = flashing ? 0.5 : 0.7;
    ctx.fillText(b.name.slice(0, 12), b.x + b.w / 2, b.y + b.h / 2, b.w - 8);
  }
  if (b.tier === 'high' && b.maxHp > 1 && !flashing) {
    ctx.globalAlpha = 0.9;
    const hpColor = getActiveTheme() === 'mono-light'
      ? (b.hp > 1 ? '#1a1a1a' : '#6b6b6b')
      : isMono() ? (b.hp > 1 ? '#ffffff' : '#71717a') : (b.hp > 1 ? '#fbbf24' : '#dc2626');
    ctx.fillStyle = hpColor;
    ctx.shadowColor = hpColor;
    ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(b.x + b.w - 8, b.y + 8, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ── Brick builder ──────────────────────────────────────────────────────────────

function getTier(pts: number): Tier {
  if (pts <= 10) return 'low';
  if (pts <= 50) return 'med';
  return 'high';
}

function buildBricks(courses: ScrapedCourse[], level: LevelNum, cw: number): GameBrick[] {
  type Item = { name: string; courseName: string; pts: number; dueDate: string; missing: boolean; };
  const items: Item[] = [];

  for (const course of courses) {
    const clr = courseColor(course.name);
    for (const cat of course.categories) {
      for (const a of cat.assignments) {
        const include =
          level === 1 ? isMissing(a) :
          level === 2 ? a.status === 'unsubmitted' :
          true;
        if (!include) continue;
        const pp = parseMaxGrade(a.maxGrade) ?? 10;
        items.push({ name: a.name, courseName: course.name, pts: pp, dueDate: a.dueDate, missing: isMissing(a) });
      }
    }
  }

  items.sort((a, b) => {
    if (a.missing !== b.missing) return a.missing ? -1 : 1;
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return da - db;
  });

  const def    = LEVEL_DEFS[level];
  const capped = items.slice(0, def.cap);
  const cols   = Math.min(def.cols, capped.length);
  if (!cols) return [];
  const bw = (cw - BRICK_GAP * (cols + 1)) / cols;

  return capped.map((item, i) => {
    const tier = getTier(item.pts);
    const { maxHp, pts } = TIER_CFG[tier];
    const color = courseColor(item.courseName, true);
    return {
      id: `${item.courseName}|${item.name}|${i}`,
      name: item.name.length > 24 ? item.name.slice(0, 23) + '…' : item.name,
      course: item.courseName,
      color, tier, shape: SHAPE_BY_TIER[tier],
      hp: maxHp, maxHp, pts,
      x: BRICK_GAP + (i % cols) * (bw + BRICK_GAP),
      y: BRICK_TOP + Math.floor(i / cols) * (BRICK_H + BRICK_GAP),
      w: bw, h: BRICK_H,
      alive: true, hitFlash: 0,
    };
  });
}

function pickPupType(): PUpType {
  const total = PUP_WEIGHTS.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PUP_TYPES.length; i++) { r -= PUP_WEIGHTS[i]; if (r <= 0) return PUP_TYPES[i]; }
  return 'wide';
}

function makeStars(cw: number): Star[] {
  return Array.from({ length: 55 }, () => ({
    x: Math.random() * cw, y: Math.random() * CANVAS_H,
    r: Math.random() * 1.2 + 0.2,
    alpha: Math.random() * 0.3 + 0.06,
    phase: Math.random() * Math.PI * 2,
  }));
}

// ── Component ──────────────────────────────────────────────────────────────────

export function GamePage({ grades }: Props) {
  const { courses } = grades;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<LevelNum>(1);

  const G = useRef<{
    phase: Phase; bricks: GameBrick[];
    ball: Ball; ball2: Ball | null;
    padX: number; padW: number;
    lives: number; score: number;
    bricksHit: number; currentSpeed: number;
    level: LevelNum; w: number;
    powerUps: PowerUp[]; particles: Particle[]; floatTexts: FloatText[]; stars: Star[];
    effects: { wide: number; slow: number; fire: number; shrink: number };
    lastPupLabel: string; lastPupTimer: number; lastPupColor: string;
    frame: number;
  }>({
    phase: 'idle', bricks: [], ball: { x: 0, y: 0, vx: 0, vy: 0 }, ball2: null,
    padX: 0, padW: PAD_W, lives: 3, score: 0, bricksHit: 0,
    currentSpeed: LEVEL_DEFS[1].baseSpeed, level: 1, w: 0,
    powerUps: [], particles: [], floatTexts: [], stars: [],
    effects: { wide: 0, slow: 0, fire: 0, shrink: 0 },
    lastPupLabel: '', lastPupTimer: 0, lastPupColor: '#fff',
    frame: 0,
  });
  const rafRef = useRef(0);

  const [ui, setUi] = useState<{
    phase: Phase; lives: number; score: number;
    bricksLeft: number; totalBricks: number; speed: number;
    effects: { wide: number; slow: number; fire: number; shrink: number };
    lastPupLabel: string; lastPupColor: string;
  }>({
    phase: 'idle', lives: 3, score: 0, bricksLeft: 0, totalBricks: 0,
    speed: LEVEL_DEFS[1].baseSpeed,
    effects: { wide: 0, slow: 0, fire: 0, shrink: 0 },
    lastPupLabel: '', lastPupColor: '#fff',
  });

  const sync = useCallback(() => {
    const g = G.current;
    setUi({
      phase: g.phase, lives: g.lives, score: g.score,
      bricksLeft: g.bricks.filter((b) => b.alive).length,
      totalBricks: g.bricks.length,
      speed: parseFloat(g.currentSpeed.toFixed(1)),
      effects: { ...g.effects },
      lastPupLabel: g.lastPupLabel,
      lastPupColor: g.lastPupColor,
    });
  }, []);

  const launch = useCallback((lvl: LevelNum) => {
    const g  = G.current;
    const cw = g.w || 580;
    const def = LEVEL_DEFS[lvl];
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
    });
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.7;
    g.ball  = { x: cw / 2, y: CANVAS_H - PAD_FLOOR - 55,
                vx: Math.cos(a) * def.baseSpeed, vy: Math.sin(a) * def.baseSpeed };
    g.phase = 'active';
    sync();
  }, [courses, sync]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d')!;

    const ro = new ResizeObserver(() => {
      const w = Math.floor(wrap.clientWidth);
      canvas.width  = w;
      canvas.height = CANVAS_H;
      G.current.w   = w;
      if (!G.current.stars.length) G.current.stars = makeStars(w);
    });
    ro.observe(wrap);

    const onMouse = (e: MouseEvent) => {
      if (G.current.phase !== 'active') return;
      const rect = canvas.getBoundingClientRect();
      const pw   = G.current.padW;
      G.current.padX = Math.max(0, Math.min(G.current.w - pw, e.clientX - rect.left - pw / 2));
    };
    const onTouch = (e: TouchEvent) => {
      if (G.current.phase !== 'active') return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pw   = G.current.padW;
      G.current.padX = Math.max(0, Math.min(G.current.w - pw, e.touches[0].clientX - rect.left - pw / 2));
    };
    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('touchmove', onTouch, { passive: false });

    function spawnParticles(x: number, y: number, color: string, n = 12) {
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd   = Math.random() * 3.5 + 0.8;
        G.current.particles.push({
          x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 1.2,
          life: 35 + Math.floor(Math.random() * 20), maxLife: 55,
          color, r: Math.random() * 3 + 1.5,
        });
      }
    }

    function spawnFloat(x: number, y: number, text: string, color: string) {
      G.current.floatTexts.push({ x, y, vy: -1.4, life: 42, maxLife: 42, text, color });
    }

    function trySpawnPup(x: number, y: number) {
      if (Math.random() > 0.38) return;
      G.current.powerUps.push({
        id: Math.random().toString(36).slice(2),
        type: pickPupType(), x: x - PUP_W / 2, y, vy: 2.0, life: 240,
      });
    }

    function applyPup(type: PUpType) {
      const g    = G.current;
      const meta = PUP_META[type];
      g.lastPupLabel = meta.label; g.lastPupColor = meta.color; g.lastPupTimer = 100;
      if (type === 'wide')   { g.effects.wide   = EFFECT_FRAMES.wide;   g.effects.shrink = 0; }
      if (type === 'shrink') { g.effects.shrink = EFFECT_FRAMES.shrink; g.effects.wide   = 0; }
      if (type === 'slow')   g.effects.slow = EFFECT_FRAMES.slow;
      if (type === 'fire')   g.effects.fire = EFFECT_FRAMES.fire;
      if (type === 'multi' && !g.ball2) {
        const b   = g.ball;
        const spd = g.currentSpeed;
        const ang = Math.atan2(-b.vy, b.vx) + (Math.random() - 0.5) * 1.0;
        g.ball2   = { x: b.x, y: b.y, vx: Math.cos(ang) * spd, vy: -Math.abs(Math.sin(ang) * spd) };
      }
      sync();
    }

    function stepBall(b: Ball, isMain: boolean, g: typeof G.current, cw: number): boolean {
      const def = LEVEL_DEFS[g.level];
      if (g.effects.slow > 0) {
        const spd = Math.hypot(b.vx, b.vy), cap = def.baseSpeed * 0.62;
        if (spd > cap) { b.vx = (b.vx / spd) * cap; b.vy = (b.vy / spd) * cap; }
      }
      b.x += b.vx; b.y += b.vy;
      if (b.x - BALL_R < 0)  { b.x = BALL_R;      b.vx =  Math.abs(b.vx); }
      if (b.x + BALL_R > cw) { b.x = cw - BALL_R; b.vx = -Math.abs(b.vx); }
      if (b.y - BALL_R < 0)  { b.y = BALL_R;      b.vy =  Math.abs(b.vy); }
      const py = CANVAS_H - PAD_FLOOR;
      const pw = g.padW;
      if (b.vy > 0 && b.y + BALL_R >= py && b.y + BALL_R <= py + PAD_H + 5 &&
          b.x >= g.padX && b.x <= g.padX + pw) {
        const hit = (b.x - (g.padX + pw / 2)) / (pw / 2);
        const ang = hit * (Math.PI / 3.2);
        const spd = g.currentSpeed;
        b.vx = Math.sin(ang) * spd; b.vy = -Math.cos(ang) * spd; b.y = py - BALL_R - 1;
      }
      if (b.y - BALL_R > CANVAS_H) {
        if (!isMain) return false;
        g.lives--;
        if (g.ball2) { g.ball = g.ball2; g.ball2 = null; return true; }
        if (g.lives <= 0) { g.phase = 'dead'; sync(); return true; }
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        g.padX = cw / 2 - PAD_W / 2;
        b.x = cw / 2; b.y = CANVAS_H - PAD_FLOOR - 55;
        b.vx = Math.cos(ang) * g.currentSpeed; b.vy = Math.sin(ang) * g.currentSpeed;
        sync();
      }
      return true;
    }

    function checkBricks(b: Ball, g: typeof G.current) {
      const def = LEVEL_DEFS[g.level];
      for (const brick of g.bricks) {
        if (!brick.alive || brick.hitFlash > 0) continue;
        if (b.x + BALL_R > brick.x && b.x - BALL_R < brick.x + brick.w &&
            b.y + BALL_R > brick.y && b.y - BALL_R < brick.y + brick.h) {
          const dmg = g.effects.fire > 0 ? brick.hp : 1;
          brick.hp -= dmg; brick.hitFlash = 6;
          if (brick.hp <= 0) {
            brick.alive = false; g.score += brick.pts; g.bricksHit++;
            g.currentSpeed = Math.min(g.currentSpeed + def.speedPerHit, def.maxSpeed);
            const spd = g.currentSpeed, len = Math.hypot(b.vx, b.vy);
            if (len > 0) { b.vx = (b.vx / len) * spd; b.vy = (b.vy / len) * spd; }
            spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 14);
            spawnFloat(brick.x + brick.w / 2, brick.y, `+${brick.pts}`, brick.color);
            trySpawnPup(brick.x + brick.w / 2, brick.y + brick.h / 2);
            sync();
          }
          const oL = b.x + BALL_R - brick.x, oR = brick.x + brick.w - (b.x - BALL_R);
          const oT = b.y + BALL_R - brick.y, oB = brick.y + brick.h - (b.y - BALL_R);
          const mn = Math.min(oL, oR, oT, oB);
          if (mn === oT || mn === oB) b.vy = -b.vy; else b.vx = -b.vx;
          break;
        }
      }
    }

    function tick() {
      const g  = G.current;
      const cw = g.w;
      rafRef.current = requestAnimationFrame(tick);
      if (!cw) return;
      g.frame++;

      if (g.phase === 'active') {
        if (g.effects.wide   > 0) g.effects.wide--;
        if (g.effects.slow   > 0) g.effects.slow--;
        if (g.effects.fire   > 0) g.effects.fire--;
        if (g.effects.shrink > 0) g.effects.shrink--;
        if (g.lastPupTimer   > 0) { g.lastPupTimer--; if (g.lastPupTimer === 0) { g.lastPupLabel = ''; sync(); } }
        g.padW = g.effects.shrink > 0 ? PAD_W * 0.58 : g.effects.wide > 0 ? PAD_W * 1.65 : PAD_W;

        stepBall(g.ball, true, g, cw);
        if (g.ball2 && !stepBall(g.ball2, false, g, cw)) g.ball2 = null;

        checkBricks(g.ball, g);
        if (g.ball2) checkBricks(g.ball2, g);

        if (g.bricks.length > 0 && !g.bricks.some((b) => b.alive) && g.phase === 'active') {
          g.phase = 'won'; sync();
        }
        for (const brick of g.bricks) if (brick.hitFlash > 0) brick.hitFlash--;

        const py = CANVAS_H - PAD_FLOOR;
        g.powerUps = g.powerUps.filter((pu) => {
          pu.y += pu.vy; pu.life--;
          if (pu.y + PUP_H >= py && pu.y <= py + PAD_H &&
              pu.x + PUP_W >= g.padX && pu.x <= g.padX + g.padW) {
            applyPup(pu.type); return false;
          }
          return pu.life > 0 && pu.y < CANVAS_H + 20;
        });
        g.particles  = g.particles.filter((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.life--; return p.life > 0; });
        g.floatTexts = g.floatTexts.filter((f) => { f.y += f.vy; f.life--; return f.life > 0; });
      }

      // ── Render ──────────────────────────────────────────────────────────────
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, cw, CANVAS_H);

      ctx.save();
      if (IS_MONO) {
        ctx.fillStyle = C.border;
        ctx.globalAlpha = 0.25;
        for (let x = 20; x < cw; x += 40) {
          for (let y = 20; y < CANVAS_H; y += 40) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        ctx.strokeStyle = C.border;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        for (let x = 0; x < cw; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke(); }
        for (let y = 0; y < CANVAS_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke(); }
      }
      ctx.restore();

      for (const s of g.stars) {
        s.phase += 0.025;
        const a = s.alpha * (0.55 + 0.45 * Math.sin(s.phase));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = C.fg; ctx.globalAlpha = a * 0.5; ctx.fill(); ctx.globalAlpha = 1;
      }

      for (const b of g.bricks) if (b.alive) drawBrick(ctx, b);

      for (const p of g.particles) {
        const a = p.life / p.maxLife; ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.r * a), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }

      for (const f of g.floatTexts) {
        const a = f.life / f.maxLife; ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = f.color; ctx.shadowColor = f.color; ctx.shadowBlur = 8;
        ctx.font = 'bold 12px -apple-system,system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(f.text, f.x, f.y); ctx.restore();
      }

      for (const pu of g.powerUps) {
        const meta = PUP_META[pu.type];
        const a = Math.min(1, pu.life / 20); ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = meta.color; ctx.shadowColor = meta.color; ctx.shadowBlur = 12;
        rr(ctx, pu.x, pu.y, PUP_W, PUP_H, 5); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff'; ctx.font = '12px -apple-system,system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(meta.icon, pu.x + PUP_W / 2, pu.y + PUP_H / 2); ctx.restore();
      }

      if (g.phase === 'active') {
        const def        = LEVEL_DEFS[g.level];
        const speedRatio = Math.min(1, (g.currentSpeed - def.baseSpeed) / (def.maxSpeed - def.baseSpeed));
        const padColor   = speedRatio < 0.5 ? C.primary : C.dest;
        const py         = CANVAS_H - PAD_FLOOR;
        const pw         = g.padW;
        ctx.save();
        ctx.fillStyle = padColor; ctx.globalAlpha = 0.88;
        ctx.shadowColor = padColor; ctx.shadowBlur = 12 + speedRatio * 24;
        rr(ctx, g.padX, py, pw, PAD_H, 6); ctx.fill();
        if (g.effects.wide > 0) {
          ctx.globalAlpha = 0.25; ctx.fillStyle = '#4ade80'; ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 16;
          rr(ctx, g.padX - 2, py - 2, pw + 4, PAD_H + 4, 7); ctx.fill();
        }
        if (g.effects.shrink > 0) {
          ctx.globalAlpha = 0.25; ctx.fillStyle = '#f87171'; ctx.shadowColor = '#f87171'; ctx.shadowBlur = 12;
          rr(ctx, g.padX, py, pw, PAD_H, 6); ctx.fill();
        }
        ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.arc(g.ball.x, g.ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = g.effects.fire > 0 ? '#fb923c' : C.fg;
        ctx.shadowColor = g.effects.fire > 0 ? '#f97316' : padColor;
        ctx.shadowBlur = g.effects.fire > 0 ? 24 : 14 + speedRatio * 14;
        ctx.fill(); ctx.restore();
        if (g.ball2) {
          ctx.save(); ctx.beginPath(); ctx.arc(g.ball2.x, g.ball2.y, BALL_R * 0.85, 0, Math.PI * 2);
          ctx.fillStyle = '#c084fc'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14;
          ctx.fill(); ctx.restore();
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('touchmove', onTouch);
    };
  }, [sync]);

  const def      = LEVEL_DEFS[level];
  const speedPct = Math.min(100, ((ui.speed - def.baseSpeed) / (def.maxSpeed - def.baseSpeed)) * 100);
  const activeEfx = (Object.entries(ui.effects) as [keyof typeof ui.effects, number][]).filter(([, v]) => v > 0);

  return (
    <div className="bs-page-enter" style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: T.bg, paddingLeft: 14 }}>
      <GameBackground />
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '22px 22px 60px', position: 'relative', zIndex: 1 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
            Arcade
          </div>
          <h1 style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: '-0.8px' }}>
            Grade Breaker
          </h1>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Break the bricks. Catch the power-ups. Avoid your homework.</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Score</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.primary, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{ui.score}</div>
        </div>
      </div>

      {/* Level selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {([1, 2, 3] as LevelNum[]).map((lvl, i) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setLevel(lvl)}
            aria-pressed={level === lvl}
            className="bs-row-enter bs-lift bs-focusable"
            style={{
              all: 'unset',
              flex: 1,
              borderRadius: 10,
              border: `1px solid ${level === lvl ? `${T.primary}60` : T.border}`,
              background: level === lvl ? `${T.primary}18` : T.card,
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              padding: '10px 12px',
              cursor: 'pointer',
              textAlign: 'left',
              animationDelay: `${i * 60}ms`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{LEVEL_DEFS[lvl].badge}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: level === lvl ? T.primary : T.text, lineHeight: 1.2 }}>
                  Level {lvl} — {LEVEL_DEFS[lvl].label}
                </div>
                <div style={{ fontSize: 9, color: T.faint, marginTop: 1, lineHeight: 1.2 }}>
                  {LEVEL_DEFS[lvl].sub}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Canvas card */}
      <div
        ref={wrapRef}
        className="bs-fade-in"
        style={{ overflow: 'hidden', borderRadius: 16, border: `1px solid ${T.primary}40`, boxShadow: `0 12px 44px rgba(0,0,0,0.4), 0 0 0 1px ${T.primary}14` }}
      >
        {/* HUD bar */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, flexWrap: 'wrap',
            borderBottom: `1px solid ${T.border}`, background: T.card,
            padding: '8px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Hearts */}
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map((i) => {
                const heartColor = isMono() ? T.primary : '#ef4444';
                const emptyStroke = isMono() ? T.border : '#2a3a52';
                return (
                  <svg key={i} viewBox="0 0 24 24" width="13" height="13"
                    fill={i < ui.lives ? heartColor : 'none'}
                    stroke={i < ui.lives ? heartColor : emptyStroke}
                    strokeWidth="2" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                );
              })}
            </div>
            {/* Speed bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: T.muted }}>SPD</span>
              <div style={{ height: 4, width: 64, background: T.faint, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2, transition: 'width 0.15s',
                  width: `${speedPct}%`,
                  background: getActiveTheme() === 'mono-light'
                    ? (speedPct < 33 ? '#9a9a9a' : speedPct < 66 ? '#4a4a4a' : '#1a1a1a')
                    : isMono()
                    ? (speedPct < 33 ? '#52525b' : speedPct < 66 ? '#a1a1aa' : '#faf9f6')
                    : (speedPct < 33 ? '#818cf8' : speedPct < 66 ? '#fbbf24' : '#ef4444'),
                }} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                {ui.speed.toFixed(1)}
              </span>
            </div>
            {/* Active effects */}
            {activeEfx.map(([key, frames]) => {
              const meta = PUP_META[key as PUpType];
              return (
                <span key={key} style={{
                  fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 99,
                  border: `1px solid ${meta.color}60`, color: meta.color, background: `${meta.color}18`,
                }}>
                  {meta.icon} {meta.label} {Math.ceil(frames / 60)}s
                </span>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {ui.lastPupLabel && (
              <span style={{ fontSize: 10, fontWeight: 700, color: ui.lastPupColor }}>{ui.lastPupLabel}!</span>
            )}
            {ui.phase === 'active' && (
              <span style={{ fontSize: 10, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
                {ui.bricksLeft}/{ui.totalBricks}
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
              {ui.score} pts
            </span>
            {ui.phase !== 'idle' && (
              <button
                onClick={() => launch(level)}
                style={{ all: 'unset', fontSize: 10, color: T.primary, cursor: 'pointer' }}
              >
                Restart
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: 'relative', background: C.bg }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: CANVAS_H }} />

          {/* Idle overlay */}
          {ui.phase === 'idle' && (
            <div className="bs-fade-in" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>Grade Breaker</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{def.badge} {def.label} — {def.sub}</div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 16, fontSize: 10, color: T.faint }}>
                  <span>⬜ Low · rect · 1 hit</span>
                  <span>{IS_MONO ? '▬' : '💊'} Med · capsule · 1 hit</span>
                  <span>◆ High · diamond · 2 hits</span>
                </div>
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 12, fontSize: 10, color: T.faint, opacity: 0.7 }}>
                  <span>{PUP_META.wide.icon} Wide</span>
                  <span>{PUP_META.slow.icon} Slow</span>
                  <span>{PUP_META.multi.icon} Multi</span>
                  <span>{PUP_META.fire.icon} Fire</span>
                  <span>{PUP_META.shrink.icon} Shrink</span>
                </div>
              </div>
              <button
                onClick={() => launch(level)}
                className="bs-lift bs-focusable" style={{ all: 'unset', background: T.primary, color: isMono() ? (getActiveTheme() === 'mono-light' ? '#faf9f6' : '#1a1a1a') : '#fff', borderRadius: 10, padding: '10px 28px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Launch Ball
              </button>
            </div>
          )}

          {/* Won overlay */}
          {ui.phase === 'won' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: getActiveTheme() === 'mono-light' ? 'rgba(250,249,246,0.94)' : isMono() ? 'rgba(26,26,26,0.92)' : 'rgba(17,24,39,0.85)' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>All Cleared! 🎉</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.fresh }}>Score: {ui.score}</div>
              <div style={{ fontSize: 11, color: T.muted }}>Now go actually do those assignments</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {level < 3 && (
                  <button
                    onClick={() => { const n = (level + 1) as LevelNum; setLevel(n); launch(n); }}
                    className="bs-lift bs-focusable" style={{ all: 'unset', background: T.primary, color: isMono() ? (getActiveTheme() === 'mono-light' ? '#faf9f6' : '#1a1a1a') : '#fff', borderRadius: 9, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Next Level →
                  </button>
                )}
                <button
                  onClick={() => launch(level)}
                  className="bs-lift bs-focusable" style={{ all: 'unset', border: `1px solid ${T.border}`, background: T.card, color: T.text, borderRadius: 9, padding: '8px 18px', fontSize: 12, cursor: 'pointer' }}
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          {/* Dead overlay */}
          {ui.phase === 'dead' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: getActiveTheme() === 'mono-light' ? 'rgba(250,249,246,0.94)' : isMono() ? 'rgba(26,26,26,0.92)' : 'rgba(17,24,39,0.85)' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Game Over</div>
              <div style={{ fontSize: 12, color: T.muted }}>Score: {ui.score}</div>
              <button
                onClick={() => launch(level)}
                className="bs-lift bs-focusable" style={{ all: 'unset', marginTop: 6, background: T.primary, color: isMono() ? (getActiveTheme() === 'mono-light' ? '#faf9f6' : '#1a1a1a') : '#fff', borderRadius: 9, padding: '8px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, fontSize: 10, color: T.faint }}>
        <span>Speed ramps {def.speedPerHit.toFixed(2)} per brick, max {def.maxSpeed}</span>
        <span style={{ marginLeft: 'auto' }}>Catch power-ups with your paddle</span>
      </div>
      </div>
    </div>
  );
}
