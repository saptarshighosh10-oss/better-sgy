// Shared module so the scheduler (which scrapes) and the status route
// (which reports) can both touch "did the last activity scrape find anything
// new" without importing each other.

let newCount = 0
let checkedAt: number | null = null

export function recordNewActivity(count: number) {
  newCount = count
  checkedAt = Date.now()
}

export function getNewActivityInfo() {
  return { newCount, checkedAt }
}
