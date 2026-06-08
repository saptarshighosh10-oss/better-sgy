'use client'

import { useState, useEffect } from 'react'

// Polls the same `/api/scrape` endpoint Settings uses so empty-state screens
// can tell "never connected" apart from "connected, first sync still running"
// — two different situations that both look like "no data" at a glance.
export function useConnection(target: 'schoology' | 'gmail'): boolean | null {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    const check = () =>
      fetch('/api/scrape')
        .then((r) => r.json())
        .then((d) => { if (alive) setConnected(!!d?.[target]?.connected) })
        .catch(() => {})
    check()
    const id = setInterval(check, 8000)
    return () => { alive = false; clearInterval(id) }
  }, [target])

  return connected
}
