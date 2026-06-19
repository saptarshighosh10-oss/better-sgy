/**
 * storage.ts — Phase 1
 *
 * Typed browser.storage.local wrappers.
 * Uses browser.storage.local (NOT sync) per project rules.
 *
 * Storage keys:
 *   bs_grade_data     — latest validated grade data
 *   bs_last_good_data — last-known-good fallback
 *   bs_scrape_meta    — metadata about last scrape (status, timestamp, error)
 */

import type { SchoologyData } from './schemas';
import type { ScrapeStatus } from './scrape-status';

// ── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  gradeData: 'bs_grade_data',
  lastGoodData: 'bs_last_good_data',
  scrapeMeta: 'bs_scrape_meta',
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScrapeMeta {
  status: ScrapeStatus;
  scrapedAt: number | null;
  courseCount: number;
  assignmentCount: number;
  error: string | null;
}

// ── Grade data ───────────────────────────────────────────────────────────────

/**
 * Save validated grade data to storage.
 * Also updates last-good-data as a fallback.
 */
export async function saveGradeData(data: SchoologyData): Promise<void> {
  await browser.storage.local.set({
    [KEYS.gradeData]: data,
    [KEYS.lastGoodData]: data,  // successful save = new last-good
  });
  console.log('[BS] Grade data saved to storage', {
    courses: data.courses.length,
    period: data.gradingPeriod,
  });
}

/**
 * Load current grade data from storage.
 */
export async function loadGradeData(): Promise<SchoologyData | null> {
  const result = await browser.storage.local.get(KEYS.gradeData);
  return (result[KEYS.gradeData] as SchoologyData) ?? null;
}

/**
 * Load the last-known-good grade data (fallback).
 * This is only different from gradeData if the latest scrape failed
 * and we refused to overwrite.
 */
export async function loadLastGoodData(): Promise<SchoologyData | null> {
  const result = await browser.storage.local.get(KEYS.lastGoodData);
  return (result[KEYS.lastGoodData] as SchoologyData) ?? null;
}

// ── Scrape metadata ──────────────────────────────────────────────────────────

/**
 * Save scrape metadata (status, timestamp, error).
 */
export async function saveScrapeMeta(meta: ScrapeMeta): Promise<void> {
  await browser.storage.local.set({ [KEYS.scrapeMeta]: meta });
}

/**
 * Load scrape metadata.
 */
export async function loadScrapeMeta(): Promise<ScrapeMeta | null> {
  const result = await browser.storage.local.get(KEYS.scrapeMeta);
  return (result[KEYS.scrapeMeta] as ScrapeMeta) ?? null;
}

export interface GradeSnapshot {
  id: string;
  timestamp: number;
  name: string;
  gradingPeriod: string;
  courses: SchoologyData['courses'];
  slotId?: string;
}

export async function saveSnapshot(name: string, data: SchoologyData): Promise<GradeSnapshot> {
  const snapshots = await loadSnapshots();
  const newSnapshot: GradeSnapshot = {
    id: `snapshot_${Date.now()}`,
    timestamp: Date.now(),
    name: name || `Snapshot - ${data.gradingPeriod} (${new Date().toLocaleDateString()})`,
    gradingPeriod: data.gradingPeriod,
    courses: data.courses,
  };
  snapshots.push(newSnapshot);
  await browser.storage.local.set({ bs_grade_snapshots: snapshots });
  return newSnapshot;
}

export async function saveSnapshotToSlot(slotId: string, name: string, data: SchoologyData): Promise<GradeSnapshot> {
  const snapshots = await loadSnapshots();
  const filtered = snapshots.filter((s) => s.slotId !== slotId);
  const newSnapshot: GradeSnapshot = {
    id: `snapshot_${Date.now()}`,
    timestamp: Date.now(),
    name: name || `Snapshot - ${data.gradingPeriod} (${new Date().toLocaleDateString()})`,
    gradingPeriod: data.gradingPeriod,
    courses: data.courses,
    slotId,
  };
  filtered.push(newSnapshot);
  await browser.storage.local.set({ bs_grade_snapshots: filtered });
  return newSnapshot;
}

export async function loadSnapshots(): Promise<GradeSnapshot[]> {
  const result = await browser.storage.local.get('bs_grade_snapshots');
  return (result.bs_grade_snapshots as GradeSnapshot[]) ?? [];
}

export async function deleteSnapshot(id: string): Promise<GradeSnapshot[]> {
  const snapshots = await loadSnapshots();
  const filtered = snapshots.filter((s) => s.id !== id);
  await browser.storage.local.set({ bs_grade_snapshots: filtered });
  return filtered;
}


