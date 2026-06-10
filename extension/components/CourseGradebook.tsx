import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { ScrapedCourse, ScrapedCategory } from '../lib/schemas';
import type { GradePoint } from '../lib/grade-history';
import {
  parseGradeString, gradeColor, checkBorderline,
  parseScore, parseMaxGrade, formatDueDate, parseDueDate,
} from '../lib/grade-utils';
import { Icon, ICON_PATHS } from './Icon';

import { T, getActiveTheme } from '../lib/theme';

function catPalette(): string[] {
  const theme = getActiveTheme();
  if (theme === 'mono-dark') return ['#faf9f6', '#d4d4d8', '#a1a1aa', '#e4e4e7', '#f4f4f5', '#71717a'];
  if (theme === 'mono-light') return ['#1a1a1a', '#3a3a3a', '#5a5a5a', '#2a2a2a', '#4a4a4a', '#6b6b6b'];
  return ['#3b82f6','#a855f7','#f59e0b','#14b8a6','#ec4899','#84cc16'];
}

const LOL_LIMIT = 500;

// ── Math helpers ──────────────────────────────────────────────────────────────

function parseWeight(w: string): number {
  const n = parseFloat(w); return isNaN(n) ? 0 : n;
}

/** Parse a what-if input string → non-negative number, or null if empty/invalid */
function parseInput(s: string | undefined): number | null {
  if (s === undefined || s.trim() === '') return null;
  const n = parseFloat(s);
  return isFinite(n) ? Math.max(0, n) : null;
}

interface EffAsg {
  key: string;            // `${catIdx}:${asgIdx}` or `h:${id}`
  name: string;
  catIdx: number;
  catName: string;
  origScore: number | null;
  origMax: number | null;
  score: number | null;   // effective (edits applied)
  max: number | null;
  isHypo: boolean;
  isEdited: boolean;      // existing assignment with changed values
  isFilled: boolean;      // was ungraded, now has a simulated score
  date: Date | null;
  dueDate: string;
  status: string;
}

interface CatSums { weight: number; ss: number; sm: number }

/** Course grade from per-category point sums. Weighted when the course defines weights. */
function gradeFromSums(cats: CatSums[], courseHasWeights: boolean): number | null {
  const withData = cats.filter(c => c.sm > 0);
  if (withData.length === 0) return null;
  if (courseHasWeights) {
    let wSum = 0, wTot = 0;
    for (const c of withData) {
      if (c.weight > 0) { wSum += (c.ss / c.sm) * 100 * c.weight; wTot += c.weight; }
    }
    return wTot > 0 ? wSum / wTot : null;
  }
  let s = 0;
  for (const c of withData) s += (c.ss / c.sm) * 100;
  return s / withData.length;
}

// ── Animated numbers ─────────────────────────────────────────────────────────

/** Smoothly tweens a displayed number toward `target` whenever it changes. */
function useAnimatedNumber(target: number | null, duration = 450): number | null {
  const [display, setDisplay] = useState(target);
  const valueRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    if (target === null) {
      valueRef.current = null;
      setDisplay(null);
      return;
    }

    const from = valueRef.current ?? target;
    if (Math.abs(from - target) < 0.005) {
      valueRef.current = target;
      setDisplay(target);
      return;
    }

    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = from + (target! - from) * eased;
      valueRef.current = val;
      setDisplay(val);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { valueRef.current = target; rafRef.current = null; }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

// ── Line chart ────────────────────────────────────────────────────────────────

const VW = 1000;
const CH = 330;
const PAD = { top: 30, right: 20, bottom: 34, left: 48 };

interface Slot {
  name: string;
  catIdx: number;
  catName: string;
  date: Date | null;
  dueDate: string;
  isHypo: boolean;
  actualScore: { sc: number; mx: number } | null;
  projScore: { sc: number; mx: number } | null;
  actualVal: number | null;   // running course grade after this point
  projVal: number | null;
}

function buildSlots(
  effAsgs: EffAsg[],
  catWeights: number[],
  courseHasWeights: boolean,
): Slot[] {
  // include slot if it contributes to either line
  const included = effAsgs.filter(a => {
    const hasActual = a.origScore !== null && a.origMax !== null && a.origMax > 0;
    const hasProj = a.score !== null && a.max !== null && a.max > 0;
    return hasActual || hasProj;
  });
  // chronological: dated first (asc), then dateless, then hypos
  const sorted = [...included].sort((a, b) => {
    if (a.isHypo !== b.isHypo) return a.isHypo ? 1 : -1;
    const ta = a.date?.getTime(), tb = b.date?.getTime();
    if (ta !== undefined && tb !== undefined) return ta - tb;
    if (ta !== undefined) return -1;
    if (tb !== undefined) return 1;
    return 0;
  });

  const aSums: CatSums[] = catWeights.map(w => ({ weight: w, ss: 0, sm: 0 }));
  const pSums: CatSums[] = catWeights.map(w => ({ weight: w, ss: 0, sm: 0 }));

  return sorted.map(a => {
    const hasActual = a.origScore !== null && a.origMax !== null && a.origMax > 0;
    const hasProj = a.score !== null && a.max !== null && a.max > 0;
    let actualVal: number | null = null;
    let projVal: number | null = null;
    if (hasActual) {
      aSums[a.catIdx].ss += a.origScore!; aSums[a.catIdx].sm += a.origMax!;
      actualVal = gradeFromSums(aSums, courseHasWeights);
    }
    if (hasProj) {
      pSums[a.catIdx].ss += a.score!; pSums[a.catIdx].sm += a.max!;
      projVal = gradeFromSums(pSums, courseHasWeights);
    }
    return {
      name: a.name,
      catIdx: a.catIdx,
      catName: a.catName,
      date: a.date,
      dueDate: a.dueDate,
      isHypo: a.isHypo,
      actualScore: hasActual ? { sc: a.origScore!, mx: a.origMax! } : null,
      projScore: hasProj ? { sc: a.score!, mx: a.max! } : null,
      actualVal,
      projVal,
    };
  });
}

function niceStep(range: number): number {
  const raw = range / 5;
  for (const s of [1, 2, 5, 10, 20, 25]) if (raw <= s) return s;
  return 50;
}

function GradeLineChart({ slots, showProj }: { slots: Slot[]; showProj: boolean }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (slots.length === 0) {
    return (
      <div style={{ background: T.bg, padding: '36px 0', textAlign: 'center', color: T.muted, fontSize: 12 }}>
        No graded assignments yet — the line appears once something is graded.
      </div>
    );
  }

  const n = slots.length;
  const aw = VW - PAD.left - PAD.right;
  const ah = CH - PAD.top - PAD.bottom;
  const cx = (i: number) => n === 1 ? PAD.left + aw / 2 : PAD.left + (i / (n - 1)) * aw;

  // Y domain from all visible values
  const vals: number[] = [];
  for (const s of slots) {
    if (s.actualVal !== null) vals.push(s.actualVal);
    if (showProj && s.projVal !== null) vals.push(s.projVal);
  }
  let lo = Math.min(...vals), hi = Math.max(...vals);
  lo = Math.max(0, Math.floor(lo - 4));
  hi = Math.min(120, Math.ceil(hi + 4));
  if (hi - lo < 10) { const mid = (hi + lo) / 2; lo = Math.max(0, mid - 5); hi = mid + 5; }
  const cy = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * ah;

  // Gridlines
  const step = niceStep(hi - lo);
  const gridVals: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) gridVals.push(v);

  // Paths (skip nulls, continuous)
  function pathOf(get: (s: Slot) => number | null): { d: string; pts: Array<{ i: number; v: number }> } {
    let d = '';
    const pts: Array<{ i: number; v: number }> = [];
    slots.forEach((s, i) => {
      const v = get(s);
      if (v === null) return;
      d += (d === '' ? 'M' : 'L') + `${cx(i).toFixed(1)},${cy(v).toFixed(1)}`;
      pts.push({ i, v });
    });
    return { d, pts };
  }
  const actual = pathOf(s => s.actualVal);
  const proj   = showProj ? pathOf(s => s.projVal) : { d: '', pts: [] };
  const dual   = showProj && proj.pts.length > 0;

  // Area fill under the primary line
  const fillLine = dual ? proj : actual;
  const fillColor = dual ? T.green : T.primary;
  let areaD = '';
  if (fillLine.pts.length > 1) {
    const first = fillLine.pts[0], last = fillLine.pts[fillLine.pts.length - 1];
    areaD = fillLine.d
      + `L${cx(last.i).toFixed(1)},${(CH - PAD.bottom).toFixed(1)}`
      + `L${cx(first.i).toFixed(1)},${(CH - PAD.bottom).toFixed(1)}Z`;
  }

  // Label density
  const labelEvery = Math.max(1, Math.ceil(n / 14));
  const tickEvery  = Math.max(1, Math.ceil(n / 8));
  const labelPts   = dual ? proj.pts : actual.pts;

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * VW;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(cx(i) - mx);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHoverIdx(best);
  }

  const hov = hoverIdx !== null ? slots[hoverIdx] : null;

  function xTickLabel(s: Slot): string {
    if (s.isHypo) return 'new';
    if (!s.date) return '·';
    return `${s.date.getMonth() + 1}/${s.date.getDate()}`;
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${CH}`}
      width="100%"
      role="img"
      aria-label="Grade trend chart. The same data appears in the assignment list below."
      style={{ display: 'block', background: T.bg }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Gridlines + y labels */}
      {gridVals.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={cy(v)} x2={VW - PAD.right} y2={cy(v)}
            stroke={T.border} strokeWidth={0.6} opacity={0.5} />
          <text x={PAD.left - 7} y={cy(v) + 3.5} textAnchor="end"
            fontSize={9.5} fill={T.muted} opacity={0.8}>{v}</text>
        </g>
      ))}

      {/* X tick labels */}
      {slots.map((s, i) => {
        if (i % tickEvery !== 0 && i !== n - 1) return null;
        return (
          <text key={i} x={cx(i)} y={CH - PAD.bottom + 16} textAnchor="middle"
            fontSize={9} fill={s.isHypo ? T.green : T.muted} opacity={0.8}>
            {xTickLabel(s)}
          </text>
        );
      })}

      {/* Area fill — flat, low opacity */}
      {areaD && <path d={areaD} fill={fillColor} fillOpacity={0.07} />}

      {/* Actual line */}
      {actual.d && (
        <path d={actual.d} fill="none" stroke={T.primary} strokeWidth={2.2}
          strokeLinejoin="round" strokeLinecap="round"
          opacity={dual ? 0.45 : 1} />
      )}
      {/* Projected line */}
      {dual && (
        <path d={proj.d} fill="none" stroke={T.green} strokeWidth={2.2}
          strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* Hover crosshair */}
      {hoverIdx !== null && (
        <line x1={cx(hoverIdx)} y1={PAD.top - 6} x2={cx(hoverIdx)} y2={CH - PAD.bottom}
          stroke={T.muted} strokeWidth={0.8} strokeDasharray="4 3" opacity={0.55} />
      )}

      {/* Dots — actual */}
      {actual.pts.map(({ i, v }) => (
        <circle key={`a${i}`} cx={cx(i)} cy={cy(v)} r={hoverIdx === i ? 5 : 3.6}
          fill={T.bg} stroke={T.primary} strokeWidth={2}
          opacity={dual ? 0.5 : 1} />
      ))}
      {/* Dots — projected */}
      {dual && proj.pts.map(({ i, v }) => (
        <circle key={`p${i}`} cx={cx(i)} cy={cy(v)} r={hoverIdx === i ? 5 : 3.6}
          fill={T.bg} stroke={T.green} strokeWidth={2} />
      ))}

      {/* Value labels above dots */}
      {labelPts.map(({ i, v }, k) => {
        if (k % labelEvery !== 0 && k !== labelPts.length - 1) return null;
        return (
          <text key={i} x={cx(i)} y={cy(v) - 9} textAnchor="middle"
            fontSize={9.5} fontWeight={700} fill={fillColor}>
            {v.toFixed(1)}
          </text>
        );
      })}

      {/* Tooltip */}
      {hov && hoverIdx !== null && (() => {
        const lines: Array<{ dot: string; label: string; val: string }> = [];
        if (hov.actualVal !== null) {
          lines.push({ dot: T.primary, label: 'Grade', val: `${hov.actualVal.toFixed(2)}%` });
        }
        if (dual && hov.projVal !== null) {
          lines.push({ dot: T.green, label: 'What-if', val: `${hov.projVal.toFixed(2)}%` });
        }
        const score = hov.projScore ?? hov.actualScore;
        const tipW = 190;
        const tipH = 36 + lines.length * 14;
        const x = cx(hoverIdx);
        const tipX = Math.min(Math.max(x + 12, PAD.left), VW - PAD.right - tipW);
        const tipY = PAD.top;
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={8}
              fill={T.card} stroke={T.border} strokeWidth={1}
              style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }} />
            <text x={tipX + 10} y={tipY + 15} fontSize={9.5} fontWeight={700} fill={T.text}>
              {hov.name.length > 30 ? hov.name.slice(0, 29) + '…' : hov.name}
            </text>
            <text x={tipX + 10} y={tipY + 27} fontSize={8.5} fill={catPalette()[hov.catIdx % 6]}>
              {hov.catName}
              <tspan fill={T.muted}>
                {'  ·  '}{hov.isHypo ? 'hypothetical' : formatDueDate(hov.dueDate) || 'no date'}
                {score ? `  ·  ${score.sc}/${score.mx}` : ''}
              </tspan>
            </text>
            {lines.map((l, li) => (
              <g key={li}>
                <circle cx={tipX + 14} cy={tipY + 37 + li * 14} r={3} fill={l.dot} />
                <text x={tipX + 23} y={tipY + 40 + li * 14} fontSize={9} fill={T.muted}>{l.label}</text>
                <text x={tipX + tipW - 10} y={tipY + 40 + li * 14} textAnchor="end"
                  fontSize={9.5} fontWeight={700} fill={l.dot}>{l.val}</text>
              </g>
            ))}
          </g>
        );
      })()}
    </svg>
  );
}

// ── Score inputs ──────────────────────────────────────────────────────────────

function NumIn({ value, placeholder, onChange, accent, highlight, label }: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  accent?: string;
  highlight?: boolean;
  label: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 36,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: highlight ? (accent ?? T.primary) : T.text,
        fontSize: 11,
        fontWeight: 700,
        padding: 0,
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
      }}
    />
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ a, pct, clr }: { a: EffAsg; pct: number | null; clr: string | null }) {
  const pctStr = pct !== null ? `${pct.toFixed(0)}%` : null;
  let icon: keyof typeof ICON_PATHS;
  let label: string;
  let color: string;

  if (a.isHypo) {
    icon = 'plus'; color = T.green;
    label = pctStr ? `New · ${pctStr}` : 'New';
  } else if (a.isEdited) {
    icon = 'edit'; color = T.amber;
    label = pctStr ? `Edited · ${pctStr}` : 'Edited';
  } else if (a.isFilled) {
    icon = 'plus'; color = T.green;
    label = pctStr ? `Filled · ${pctStr}` : 'Filled';
  } else if (a.origScore === null) {
    if (a.status === 'unsubmitted') { icon = 'alert'; label = 'Missing'; color = T.red; }
    else { icon = 'minus'; label = 'Ungraded'; color = T.faint; }
  } else {
    icon = 'check'; color = clr ?? T.muted;
    label = pctStr ?? 'Graded';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, color,
      background: color + '18', border: `1px solid ${color}35`,
      borderRadius: 7, padding: '3px 8px', flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      <Icon name={icon} size={11} />
      {label}
    </span>
  );
}

// ── Row action menu ───────────────────────────────────────────────────────────

const menuItemStyle: React.CSSProperties = {
  all: 'unset', display: 'flex', alignItems: 'center', gap: 8,
  width: '100%', boxSizing: 'border-box', padding: '8px 12px',
  fontSize: 11, fontWeight: 600, color: T.text, cursor: 'pointer',
};

function RowMenu({ canReset, canRemove, open, onToggle, onClose, onReset, onRemove }: {
  canReset: boolean;
  canRemove: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  if (!canReset && !canRemove) {
    return <div style={{ width: 22, flexShrink: 0 }} />;
  }
  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onKeyDown={(e) => { if (e.key === 'Escape' && open) onClose(); }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded={open}
        className="bs-focusable"
        style={{ all: 'unset', cursor: 'pointer', color: T.muted, padding: 6, display: 'flex', borderRadius: 5 }}
      >
        <Icon name="dots" size={14} />
      </button>
      {open && (
        <>
          <div onClick={onClose} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 31,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)', minWidth: 160, overflow: 'hidden',
          }}>
            {canReset && (
              <button type="button" onClick={() => { onReset(); onClose(); }} className="bs-focusable" style={menuItemStyle}>
                <Icon name="undo" size={12} /> Reset to original
              </button>
            )}
            {canRemove && (
              <button type="button" onClick={() => { onRemove(); onClose(); }} className="bs-focusable" style={{ ...menuItemStyle, color: T.red }}>
                <Icon name="trash" size={12} /> Remove assignment
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Category section ──────────────────────────────────────────────────────────

interface HypoAsg { id: number; catIdx: number; name: string; score: string; max: string }
interface Override { score?: string; max?: string }

function CategoryRow({
  cat, catIdx, asgs, overrides, onOverride, onResetOne, hypos, onHypoChange, onHypoAdd, onHypoRemove,
  courseCategories,
}: {
  cat: ScrapedCategory;
  catIdx: number;
  asgs: EffAsg[];
  overrides: Map<string, Override>;
  onOverride: (key: string, field: 'score' | 'max', val: string) => void;
  onResetOne: (key: string) => void;
  hypos: HypoAsg[];
  onHypoChange: (id: number, field: 'name' | 'score' | 'max', val: string) => void;
  onHypoAdd: (catIdx: number) => void;
  onHypoRemove: (id: number) => void;
  courseCategories: ScrapedCategory[];
}) {
  const color = catPalette()[catIdx % 6];
  const catName = cat.name.replace(/\s*category\s*$/i, '').trim() || cat.name;
  const weight = parseWeight(cat.weight);
  const [expanded, setExpanded] = useState(true);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  // Effective + original sums for this category
  let ss = 0, sm = 0, oss = 0, osm = 0;
  for (const a of asgs) {
    if (a.score !== null && a.max !== null && a.max > 0) { ss += a.score; sm += a.max; }
    if (a.origScore !== null && a.origMax !== null && a.origMax > 0) { oss += a.origScore; osm += a.origMax; }
  }
  const effPct  = sm  > 0 ? (ss / sm) * 100 : null;
  const origPct = osm > 0 ? (oss / osm) * 100 : null;
  const catDelta = effPct !== null && origPct !== null ? effPct - origPct : null;
  const animatedEffPct = useAnimatedNumber(effPct);

  const gradedCount = asgs.filter(a => a.score !== null).length;

  // Contribution to final grade
  const totalW = courseCategories
    .filter(c => parseWeight(c.weight) > 0)
    .reduce((s, c) => s + parseWeight(c.weight), 0);
  const contribution = weight > 0 && effPct !== null ? (effPct * weight) / (totalW || 100) : null;

  return (
    <div style={{ borderBottom: `1px solid ${T.rowBorder}` }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ width: 4, background: color, borderRadius: 4, flexShrink: 0, margin: '10px 0 10px 10px' }} />
        <div style={{ flex: 1, padding: '10px 14px' }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{catName}</span>
            {weight > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, color, background: color + '20', border: `1px solid ${color}40`, borderRadius: 6, padding: '1px 5px' }}>
                {cat.weight}
              </span>
            )}
            <span style={{ fontSize: 9, color: T.muted }}>{gradedCount}/{asgs.length} graded</span>
            {catDelta !== null && Math.abs(catDelta) >= 0.05 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: catDelta > 0 ? T.green : T.red }}>
                {catDelta > 0 ? '+' : ''}{catDelta.toFixed(1)}%
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded(p => !p)}
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Hide' : 'Show'} ${catName} assignments`}
              className="bs-focusable"
              style={{ all: 'unset', marginLeft: 'auto', cursor: 'pointer', fontSize: 10, color: T.muted, padding: '6px 8px' }}
            >
              {expanded ? '▲ hide' : '▼ assignments'}
            </button>
          </div>

          {/* Stat columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Current %</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: gradeColor(effPct) ?? T.muted, fontVariantNumeric: 'tabular-nums' }}>
                {animatedEffPct !== null ? `${animatedEffPct.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Weight</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{weight > 0 ? `${weight}%` : '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Points</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                {sm > 0 ? `${+ss.toFixed(1)}/${+sm.toFixed(1)}` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Impact</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                {contribution !== null ? `${contribution.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment rows */}
      <div className="bs-collapse" style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}>
        <div>
          <div className="bs-collapse-content" style={{ paddingLeft: 17, opacity: expanded ? 1 : 0 }}>
          {asgs.map((a, i) => {
            const ov = overrides.get(a.key);
            const hypo = a.isHypo ? hypos.find(h => `h:${h.id}` === a.key) : undefined;
            const pct = a.score !== null && a.max ? (a.score / a.max) * 100 : null;
            const clr = gradeColor(pct);
            // Pre-fill with the real current value (override if edited, else original)
            // so existing scores like "16.5/19.5" are visible and directly editable.
            const scoreStr = a.isHypo
              ? (hypo?.score ?? '')
              : (ov?.score ?? (a.origScore !== null ? String(a.origScore) : ''));
            const maxStr = a.isHypo
              ? (hypo?.max ?? '')
              : (ov?.max ?? (a.origMax !== null ? String(a.origMax) : ''));
            const scoreEdited = a.isHypo ? true : ov?.score !== undefined;
            const maxEdited = a.isHypo ? true : ov?.max !== undefined;
            const lol = (parseInput(scoreStr) ?? 0) > LOL_LIMIT || (parseInput(maxStr) ?? 0) > LOL_LIMIT;
            const accent = a.isHypo || a.isFilled ? T.green : T.amber;
            const pillBorder = (scoreEdited || maxEdited) ? accent + '60' : T.border;

            return (
              <div key={a.key} className="bs-row-enter" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: `1px solid ${T.rowBorder}`, animationDelay: `${Math.min(i, 12) * 30}ms` }}>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {a.isHypo && hypo ? (
                    <input
                      type="text"
                      value={hypo.name}
                      placeholder="New assignment"
                      aria-label="Hypothetical assignment name"
                      className="bs-focusable"
                      onChange={(e) => onHypoChange(hypo.id, 'name', e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box', background: T.bg, border: `1px solid ${T.border}`,
                        borderRadius: 8, color: T.text, fontSize: 12, fontWeight: 600, padding: '4px 8px', outline: 'none',
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontSize: 10, color: T.muted, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {a.isHypo ? (
                      <span>Hypothetical assignment</span>
                    ) : (
                      <>
                        <Icon name="calendar" size={10} />
                        <span>{formatDueDate(a.dueDate) || 'No due date'}</span>
                        {a.isEdited && a.origScore !== null && a.origMax !== null && (
                          <span style={{ color: T.faint }}>· was {a.origScore}/{a.origMax}</span>
                        )}
                      </>
                    )}
                    {lol && (
                      <span style={{ fontStyle: 'italic', fontWeight: 600, color: T.amber }}>· Lol you wish</span>
                    )}
                  </div>
                </div>

                {/* Status pill */}
                <StatusPill a={a} pct={pct} clr={clr} />

                {/* Score pill — always editable */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                  background: T.bg, border: `1px solid ${pillBorder}`, borderRadius: 8, padding: '4px 8px',
                }}>
                  <NumIn
                    value={scoreStr}
                    placeholder={a.origScore !== null ? String(a.origScore) : '–'}
                    accent={accent}
                    highlight={scoreEdited}
                    label={`Score for ${a.name}`}
                    onChange={(v) => a.isHypo && hypo ? onHypoChange(hypo.id, 'score', v) : onOverride(a.key, 'score', v)}
                  />
                  <span style={{ color: T.faint, fontSize: 11 }} aria-hidden="true">/</span>
                  <NumIn
                    value={maxStr}
                    placeholder={a.origMax !== null ? String(a.origMax) : '–'}
                    accent={accent}
                    highlight={maxEdited}
                    label={`Points possible for ${a.name}`}
                    onChange={(v) => a.isHypo && hypo ? onHypoChange(hypo.id, 'max', v) : onOverride(a.key, 'max', v)}
                  />
                </div>

                {/* More actions */}
                <RowMenu
                  canReset={!a.isHypo && (a.isEdited || a.isFilled)}
                  canRemove={a.isHypo}
                  open={menuFor === a.key}
                  onToggle={() => setMenuFor(p => p === a.key ? null : a.key)}
                  onClose={() => setMenuFor(null)}
                  onReset={() => onResetOne(a.key)}
                  onRemove={() => hypo && onHypoRemove(hypo.id)}
                />
              </div>
            );
          })}

          {/* Add hypothetical */}
          <div style={{ padding: '6px 14px 10px', borderTop: `1px solid ${T.rowBorder}` }}>
            <button
              type="button"
              onClick={() => onHypoAdd(catIdx)}
              className="bs-focusable"
              style={{
                all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box',
                padding: '8px 0',
                border: `1px dashed ${T.faint}`, borderRadius: 10, textAlign: 'center',
                fontSize: 10, fontWeight: 600, color: T.muted,
              }}
            >
              + Add assignment to {catName}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  course: ScrapedCourse;
  historyPoints?: GradePoint[];
  nickname?: string;
}

export function CourseGradebook({ course, nickname }: Props) {
  const { letter, percent } = parseGradeString(course.grade);
  const [overrides, setOverrides] = useState<Map<string, Override>>(new Map());
  const [hypos, setHypos] = useState<HypoAsg[]>([]);
  const hypoIdRef = useRef(1);

  const courseHasWeights = course.categories.some(c => parseWeight(c.weight) > 0);
  const catWeights = course.categories.map(c => parseWeight(c.weight));
  const hasEdits = overrides.size > 0 || hypos.length > 0;

  // Build effective assignment list (edits always applied)
  const effAsgs = useMemo<EffAsg[]>(() => {
    const out: EffAsg[] = [];
    course.categories.forEach((cat, ci) => {
      const cleanCat = cat.name.replace(/\s*category\s*$/i, '').trim() || cat.name;
      cat.assignments.forEach((a, ai) => {
        const key = `${ci}:${ai}`;
        const origScore = parseScore(a.score);
        const origMax = parseMaxGrade(a.maxGrade);
        const ov = overrides.get(key);
        const ovScore = parseInput(ov?.score);
        const ovMax = parseInput(ov?.max);
        out.push({
          key,
          name: a.name,
          catIdx: ci,
          catName: cleanCat,
          origScore, origMax,
          score: ovScore ?? origScore,
          max: ovMax ?? origMax,
          isHypo: false,
          isEdited: origScore !== null && (ovScore !== null || ovMax !== null),
          isFilled: origScore === null && ovScore !== null,
          date: parseDueDate(a.dueDate),
          dueDate: a.dueDate,
          status: a.status,
        });
      });
    });
    for (const h of hypos) {
      const cat = course.categories[h.catIdx];
      if (!cat) continue;
      out.push({
        key: `h:${h.id}`,
        name: h.name || 'New assignment',
        catIdx: h.catIdx,
        catName: cat.name.replace(/\s*category\s*$/i, '').trim() || cat.name,
        origScore: null, origMax: null,
        score: parseInput(h.score), max: parseInput(h.max),
        isHypo: true, isEdited: false, isFilled: false,
        date: null, dueDate: '', status: 'hypothetical',
      });
    }
    return out;
  }, [course, overrides, hypos]);

  // Course grades: computed baseline vs projected (delta is 0 until something is edited)
  const { baselineGrade, projectedGrade } = useMemo(() => {
    const base: CatSums[] = catWeights.map(w => ({ weight: w, ss: 0, sm: 0 }));
    const projd: CatSums[] = catWeights.map(w => ({ weight: w, ss: 0, sm: 0 }));
    for (const a of effAsgs) {
      if (a.origScore !== null && a.origMax !== null && a.origMax > 0) {
        base[a.catIdx].ss += a.origScore; base[a.catIdx].sm += a.origMax;
      }
      if (a.score !== null && a.max !== null && a.max > 0) {
        projd[a.catIdx].ss += a.score; projd[a.catIdx].sm += a.max;
      }
    }
    return {
      baselineGrade: gradeFromSums(base, courseHasWeights),
      projectedGrade: gradeFromSums(projd, courseHasWeights),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effAsgs, courseHasWeights]);

  const delta = hasEdits && projectedGrade !== null && baselineGrade !== null
    ? projectedGrade - baselineGrade
    : null;
  // anchor on the official grade so the number matches Schoology until something is edited
  const displayPct = delta !== null && percent !== null
    ? percent + delta
    : delta !== null && projectedGrade !== null
    ? projectedGrade
    : percent;
  const displayColor = gradeColor(displayPct);
  const borderInfo = checkBorderline(displayPct);
  const animatedDisplayPct = useAnimatedNumber(displayPct);

  const slots = useMemo(
    () => buildSlots(effAsgs, catWeights, courseHasWeights),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effAsgs, courseHasWeights],
  );

  const gradedCount = effAsgs.filter(a => !a.isHypo && a.origScore !== null).length;
  const totalCount = course.categories.reduce((s, c) => s + c.assignments.length, 0);
  const missingCount = course.categories.flatMap(c => c.assignments).filter(a => a.status === 'unsubmitted').length;

  function setOverride(key: string, field: 'score' | 'max', val: string) {
    setOverrides(prev => {
      const next = new Map(prev);
      const cur = { ...(next.get(key) ?? {}) };
      if (val.trim() === '') delete cur[field]; else cur[field] = val;
      if (cur.score === undefined && cur.max === undefined) next.delete(key);
      else next.set(key, cur);
      return next;
    });
  }

  function resetOne(key: string) {
    setOverrides(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  function addHypo(catIdx: number) {
    setHypos(prev => [...prev, { id: hypoIdRef.current++, catIdx, name: '', score: '10', max: '10' }]);
  }

  function changeHypo(id: number, field: 'name' | 'score' | 'max', val: string) {
    setHypos(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h));
  }

  function removeHypo(id: number) {
    setHypos(prev => prev.filter(h => h.id !== id));
  }

  function resetAll() {
    setOverrides(new Map());
    setHypos([]);
  }

  const visibleCats = course.categories
    .map((cat, ci) => ({ cat, ci }))
    .filter(({ cat }) => cat.assignments.length > 0);

  return (
    <div>
      {/* ── Course header ─────────────────────────────────────────── */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '16px 16px 0 0', padding: '12px 18px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: displayColor ?? T.text, lineHeight: 1, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
                {animatedDisplayPct !== null ? `${animatedDisplayPct.toFixed(2)}%` : '—'}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nickname || course.name}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: displayColor ?? T.muted }}>{letter}</span>
            </div>
            {nickname && <div style={{ fontSize: 10, color: T.muted, opacity: 0.8, marginTop: 2 }}>{course.name}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {borderInfo && (
              <span style={{ fontSize: 10, fontWeight: 600, color: T.amber, background: T.amber + '15', border: `1px solid ${T.amber}30`, borderRadius: 8, padding: '2px 7px' }}>
                ↗ Borderline {borderInfo.currentLetter}→{borderInfo.nextLetter}
              </span>
            )}
            {delta !== null && Math.abs(delta) >= 0.01 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: delta > 0 ? T.green : T.red, background: (delta > 0 ? T.green : T.red) + '18', borderRadius: 8, padding: '2px 8px' }}>
                {delta > 0 ? '+' : ''}{delta.toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Teacher', val: course.teacher || '—' },
            { label: 'Graded', val: `${gradedCount}/${totalCount}` },
            { label: 'Missing', val: missingCount > 0 ? String(missingCount) : 'None', accent: missingCount > 0 ? T.red : T.green },
            { label: 'Categories', val: String(visibleCats.length) },
          ].map(({ label, val, accent }) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: accent ?? T.muted, marginTop: 1 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Legend + reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.rowBorder}` }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.muted }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', border: `2px solid ${T.primary}`, display: 'inline-block', boxSizing: 'border-box' }} />
            Grade
          </span>
          {hasEdits && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.muted }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', border: `2px solid ${T.green}`, display: 'inline-block', boxSizing: 'border-box' }} />
              What-if
            </span>
          )}
          {!hasEdits ? (
            <span style={{ fontSize: 10, color: T.muted, opacity: 0.85 }}>
              Type over any score below, fill in ungraded work, or add new assignments — the graph updates live
            </span>
          ) : (
            <button
              type="button"
              onClick={resetAll}
              className="bs-focusable"
              style={{
                all: 'unset', marginLeft: 'auto', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: T.amber,
                background: T.amber + '15', border: `1px solid ${T.amber}35`,
                borderRadius: 8, padding: '5px 12px',
              }}
            >
              ↺ Reset what-if edits
            </button>
          )}
        </div>
      </div>

      {/* ── Grade line chart ──────────────────────────────────────── */}
      <GradeLineChart slots={slots} showProj={hasEdits} />

      {/* ── Category rows ─────────────────────────────────────────── */}
      {visibleCats.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: T.muted, fontSize: 13, background: T.card, borderRadius: '0 0 16px 16px', border: `1px solid ${T.border}`, borderTop: 'none' }}>
          No assignment data.
        </div>
      ) : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
          {visibleCats.map(({ cat, ci }) => (
            <CategoryRow
              key={cat.name}
              cat={cat}
              catIdx={ci}
              asgs={effAsgs.filter(a => a.catIdx === ci)}
              overrides={overrides}
              onOverride={setOverride}
              onResetOne={resetOne}
              hypos={hypos.filter(h => h.catIdx === ci)}
              onHypoChange={changeHypo}
              onHypoAdd={addHypo}
              onHypoRemove={removeHypo}
              courseCategories={course.categories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
