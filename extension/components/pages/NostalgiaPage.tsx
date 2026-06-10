import React, { useState, useEffect } from 'react';
import type { ScrapedCourse, SchoologyData } from '../../lib/schemas';
import { loadSnapshots, saveSnapshotToSlot, deleteSnapshot, type GradeSnapshot } from '../../lib/storage';
import { parseGradeString } from '../../lib/grade-utils';
import { T, inkOnAccent } from '../../lib/theme';
import { SideDecor } from '../SideDecor';

interface Props {
  grades: {
    courses: ScrapedCourse[];
    data: SchoologyData | null;
  };
  onViewSnapshot: (snap: GradeSnapshot) => void;
}

const YEARS = [
  { grade: 9, label: 'Freshman Year' },
  { grade: 10, label: 'Sophomore Year' },
  { grade: 11, label: 'Junior Year' },
  { grade: 12, label: 'Senior Year' },
] as const;

const GRAD_YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];

function parseGradingPeriod(periodStr: string): { year: number | null; semester: 1 | 2 } {
  if (!periodStr) return { year: null, semester: 1 };

  let year: number | null = null;
  const yearMatch = periodStr.match(/(\d{2,4})[-/](\d{2,4})/);
  if (yearMatch) {
    let yr = parseInt(yearMatch[1], 10);
    if (yr < 100) yr += 2000;
    year = yr;
  } else {
    const singleYearMatch = periodStr.match(/\b(20\d{2}|\d{2})\b/);
    if (singleYearMatch) {
      let yr = parseInt(singleYearMatch[1], 10);
      if (yr < 100) yr += 2000;
      year = yr;
    }
  }

  let semester: 1 | 2 = 1;
  const lower = periodStr.toLowerCase();
  if (lower.includes('t2') || lower.includes('s2') || lower.includes('semester 2') || lower.includes('term 2') || lower.includes('spring')) {
    semester = 2;
  }

  return { year, semester };
}

export function NostalgiaPage({ grades, onViewSnapshot }: Props) {
  const [snapshots, setSnapshots] = useState<GradeSnapshot[]>([]);
  const [gradYear, setGradYear] = useState<number | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  useEffect(() => {
    loadSnapshots().then(setSnapshots).catch(() => {});
    browser.storage.local.get(['bs_grad_year']).then((result) => {
      if (result.bs_grad_year) setGradYear(Number(result.bs_grad_year));
    }).catch(() => {});
  }, []);

  // Auto-detect the current semester slot from the grad year + grading period.
  useEffect(() => {
    if (!gradYear || !grades.data?.gradingPeriod) { setActiveSlotId(null); return; }
    const { year: currentSchoolYear, semester } = parseGradingPeriod(grades.data.gradingPeriod);
    if (!currentSchoolYear) { setActiveSlotId(null); return; }
    const entryYear = gradYear - 4;
    const gradeLevel = 9 + (currentSchoolYear - entryYear);
    setActiveSlotId(gradeLevel >= 9 && gradeLevel <= 12 ? `${gradeLevel}-sem${semester}` : null);
  }, [gradYear, grades.data]);

  const saveGradYear = (yrVal: string) => {
    if (yrVal === '') {
      setGradYear(null);
      browser.storage.local.remove('bs_grad_year').catch(() => {});
    } else {
      const yrNum = Number(yrVal);
      setGradYear(yrNum);
      browser.storage.local.set({ bs_grad_year: yrNum }).catch(() => {});
    }
  };

  const getSnapshotStats = (snap: GradeSnapshot) => {
    let totalUnweighted = 0;
    let gradedCount = 0;
    snap.courses.forEach((c) => {
      const { percent } = parseGradeString(c.grade);
      if (percent !== null) {
        gradedCount++;
        let pts = 0;
        if (percent >= 93) pts = 4.0;
        else if (percent >= 90) pts = 3.7;
        else if (percent >= 87) pts = 3.3;
        else if (percent >= 83) pts = 3.0;
        else if (percent >= 80) pts = 2.7;
        else if (percent >= 77) pts = 2.3;
        else if (percent >= 73) pts = 2.0;
        else if (percent >= 70) pts = 1.7;
        else if (percent >= 60) pts = 1.0;
        totalUnweighted += pts;
      }
    });
    const gpa = gradedCount > 0 ? totalUnweighted / gradedCount : null;
    return { gpa, count: gradedCount };
  };

  const handleCapture = async (slotId: string, slotName: string) => {
    if (!grades.data) return;
    const name = `${slotName} (${new Date().toLocaleDateString()})`;
    const snap = await saveSnapshotToSlot(slotId, name, grades.data);
    setSnapshots((prev) => [...prev.filter((s) => s.slotId !== slotId), snap]);
  };

  const getBestYear = () => {
    let bestYearName = '—';
    let highestGPA = -1;
    for (const yr of YEARS) {
      const yrSnaps = snapshots.filter((s) => s.slotId === `${yr.grade}-sem1` || s.slotId === `${yr.grade}-sem2`);
      let total = 0, valid = 0;
      yrSnaps.forEach((s) => { const { gpa } = getSnapshotStats(s); if (gpa !== null) { total += gpa; valid++; } });
      if (valid > 0) {
        const avg = total / valid;
        if (avg > highestGPA) { highestGPA = avg; bestYearName = yr.label.replace(' Year', ''); }
      }
    }
    return { name: bestYearName, gpa: highestGPA > -1 ? highestGPA.toFixed(2) : null };
  };

  const bestYear = getBestYear();
  const allGpas = snapshots.map((s) => getSnapshotStats(s).gpa).filter((g): g is number => g !== null);
  const peakGpa = allGpas.length ? Math.max(...allGpas) : null;
  const capturedCount = snapshots.length;
  const gpaColor = (g: number) => (g >= 3.7 ? T.green : g >= 3.0 ? T.primary : g >= 2.0 ? T.amber : T.red);

  const statCard = (label: string, value: string, sub?: string, color?: string) => (
    <div style={{ flex: 1, minWidth: 118, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px', boxSizing: 'border-box' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || T.text, marginTop: 4, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{sub}</div>}
    </div>
  );

  const renderSemester = (slotId: string, label: string, snap: GradeSnapshot | undefined, captureName: string) => {
    const isActive = activeSlotId === slotId;
    const stats = snap ? getSnapshotStats(snap) : null;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', borderRadius: 10, marginBottom: 6, boxSizing: 'border-box',
        background: isActive ? T.activeBg : T.card, border: `1px solid ${isActive ? T.primary + '66' : T.border}`,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, width: 88, flexShrink: 0 }}>{label}</div>
        {snap && stats ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: stats.gpa !== null ? gpaColor(stats.gpa) : T.muted, fontVariantNumeric: 'tabular-nums' }}>
              {stats.gpa !== null ? stats.gpa.toFixed(2) : '—'}
            </div>
            <div style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              GPA · {stats.count} course{stats.count !== 1 ? 's' : ''}
            </div>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => onViewSnapshot(snap)} className="bs-focusable"
              style={{ all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: inkOnAccent(), background: T.primary, borderRadius: 7, padding: '5px 12px' }}>View</button>
            <button type="button" title="Delete capture" aria-label="Delete capture" className="bs-focusable"
              onClick={async () => { const u = await deleteSnapshot(snap.id); setSnapshots(u); }}
              style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: T.muted, padding: '3px 6px', borderRadius: 6, lineHeight: 1 }}>✕</button>
          </>
        ) : (
          <>
            {isActive && <span style={{ fontSize: 9, fontWeight: 800, color: inkOnAccent(), background: T.primary, borderRadius: 999, padding: '1px 7px', letterSpacing: '0.4px' }}>CURRENT</span>}
            <div style={{ fontSize: 11.5, color: T.muted }}>{isActive ? 'Ready to capture' : 'Not captured'}</div>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => handleCapture(slotId, captureName)} disabled={!grades.data} className="bs-focusable"
              style={{
                all: 'unset', cursor: grades.data ? 'pointer' : 'default', fontSize: 11, fontWeight: 600,
                color: isActive ? inkOnAccent() : T.primary, background: isActive ? T.primary : 'transparent',
                border: `1px solid ${T.primary}`, borderRadius: 7, padding: '5px 12px', opacity: grades.data ? 1 : 0.45,
              }}>
              Capture
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: T.bg, paddingLeft: 14 }}>
      <SideDecor variant="calm" />
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '20px 22px 70px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.4px' }}>Nostalgia</div>
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>Your grade history, captured semester by semester.</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
          {statCard('Peak GPA', peakGpa !== null ? peakGpa.toFixed(2) : '—', peakGpa !== null ? 'across all semesters' : 'no captures yet', peakGpa !== null ? gpaColor(peakGpa) : undefined)}
          {statCard('Best Year', bestYear.name, bestYear.gpa ? `${bestYear.gpa} GPA` : '—')}
          {statCard('Captured', `${capturedCount}/8`, 'semesters')}
          <div style={{ flex: 1, minWidth: 132, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Graduation</div>
            <select value={gradYear ?? ''} onChange={(e) => saveGradYear(e.target.value)} className="bs-focusable"
              style={{ marginTop: 6, background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 8px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              <option value="">Set year…</option>
              {GRAD_YEARS.map((y) => <option key={y} value={y}>Class of {y}</option>)}
            </select>
          </div>
        </div>

        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div style={{ position: 'absolute', left: 5, top: 8, bottom: 8, width: 2, background: T.border }} />
          {YEARS.map((yr) => {
            const sem1Id = `${yr.grade}-sem1`;
            const sem2Id = `${yr.grade}-sem2`;
            const snap1 = snapshots.find((s) => s.slotId === sem1Id);
            const snap2 = snapshots.find((s) => s.slotId === sem2Id);
            const hasAny = !!(snap1 || snap2);
            return (
              <div key={yr.grade} style={{ marginBottom: 22, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -23, top: 3, width: 12, height: 12, borderRadius: '50%', background: T.bg, border: `2px solid ${hasAny ? T.primary : T.border}`, boxSizing: 'border-box' }} />
                <div style={{ fontSize: 11, fontWeight: 800, color: T.text, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 9 }}>
                  {yr.grade}th · {yr.label.replace(' Year', '')}
                </div>
                {renderSemester(sem1Id, 'Semester 1', snap1, `${yr.label} — Semester 1`)}
                {renderSemester(sem2Id, 'Semester 2', snap2, `${yr.label} — Semester 2`)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
