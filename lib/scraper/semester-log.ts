import fs from 'fs'
import path from 'path'

const LOG_PATH = path.join(process.cwd(), 'data', 'semester-log.json')

export type SemesterEntry = {
  period: string          // e.g. "25-26 T2"
  firstSeenAt: number     // ms timestamp
  lastSeenAt: number      // ms timestamp
  predictedEndDate: string | null  // ISO date "YYYY-MM-DD"
  gradesUrl: string       // the URL used at time of first scrape
}

export type SemesterLog = {
  updatedAt: number
  current: string | null  // period name currently active
  history: SemesterEntry[]
}

// FUHSD calendar estimates for common period name patterns
// These are checked when a new period is first seen
const FUHSD_PERIOD_ENDS: Record<string, string> = {
  'T1':  '-01-24',   // Trimester 1 ends late Jan
  'T2':  '-04-18',   // Trimester 2 ends mid Apr
  'T3':  '-06-12',   // Trimester 3 ends early Jun
  'S1':  '-01-24',   // Semester 1 ends late Jan
  'S2':  '-06-12',   // Semester 2 ends early Jun
}

function predictEnd(period: string): string | null {
  // Extract year from "25-26 T2" → "2026", "24-25 T1" → "2025"
  const m = period.match(/(\d{2})-(\d{2})\s+(T\d|S\d)/i)
  if (!m) return null
  const suffix   = m[3].toUpperCase()
  const year4    = `20${m[2]}`  // end year of the school year
  const datePart = FUHSD_PERIOD_ENDS[suffix]
  if (!datePart) return null
  return `${year4}${datePart}`
}

function load(): SemesterLog {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'))
  } catch {
    return { updatedAt: 0, current: null, history: [] }
  }
}

function save(log: SemesterLog) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2))
}

/**
 * Called after each successful scrape with the grading period extracted from the page.
 * Updates the log file and returns whether the semester changed.
 */
export function recordSemester(period: string, gradesUrl: string): { changed: boolean } {
  if (!period) return { changed: false }

  const log  = load()
  const now  = Date.now()
  const prev = log.current

  const existing = log.history.find(e => e.period === period)
  if (existing) {
    existing.lastSeenAt = now
  } else {
    log.history.push({
      period,
      firstSeenAt: now,
      lastSeenAt:  now,
      predictedEndDate: predictEnd(period),
      gradesUrl,
    })
  }

  log.current   = period
  log.updatedAt = now
  save(log)

  return { changed: prev !== null && prev !== period }
}

export function getSemesterLog(): SemesterLog {
  return load()
}

export function getCurrentSemester(): SemesterEntry | null {
  const log = load()
  if (!log.current) return null
  return log.history.find(e => e.period === log.current) ?? null
}

/**
 * Returns true if today is within `warningDays` of the predicted semester end.
 */
export function isSemesterEndingSoon(warningDays = 14): boolean {
  const entry = getCurrentSemester()
  if (!entry?.predictedEndDate) return false
  const end  = new Date(entry.predictedEndDate).getTime()
  const now  = Date.now()
  return end - now <= warningDays * 86_400_000 && end >= now
}
