'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SchoolYear, AnalyticsSummary } from './types'

export type GradesData = {
  schoolYears: SchoolYear[]
  analytics: AnalyticsSummary | null
  scrapedAt: number | null
  loading: boolean
  error: string | null
}

// Module-level cache so all components share one fetch
let cache: GradesData | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

export async function refreshGradesCache(): Promise<void> {
  try {
    const res = await fetch('/api/grades', { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    cache = {
      schoolYears: json.years ?? [],
      analytics:   json.analytics ?? null,
      scrapedAt:   json.scrapedAt ?? null,
      loading:     false,
      error:       null,
    }
  } catch (e) {
    cache = {
      schoolYears: cache?.schoolYears ?? [],
      analytics:   cache?.analytics ?? null,
      scrapedAt:   cache?.scrapedAt ?? null,
      loading:     false,
      error:       String(e),
    }
  }
  notify()
}

export function useSchoolYears(): GradesData & { refresh: () => Promise<void> } {
  const [state, setState] = useState<GradesData>(
    cache ?? { schoolYears: [], analytics: null, scrapedAt: null, loading: true, error: null }
  )
  const fetched = useRef(false)

  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    await refreshGradesCache()
  }, [])

  useEffect(() => {
    const update = () =>
      setState(cache ?? { schoolYears: [], analytics: null, scrapedAt: null, loading: false, error: null })
    listeners.add(update)

    if (!cache && !fetched.current) {
      fetched.current = true
      refreshGradesCache()
    }

    return () => { listeners.delete(update) }
  }, [])

  return { ...state, refresh }
}
