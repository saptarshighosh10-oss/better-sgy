'use client'

import { useEffect, useState, useRef } from 'react'

const IDLE_MS = 60 * 60 * 1000 // 1 hour

export function Screensaver() {
  const [active, setActive] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function reset() {
      setActive(false)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setActive(true), IDLE_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timer.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [])

  if (!active) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center bg-black"
      onClick={() => setActive(false)}
      onKeyDown={(e) => { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') setActive(false) }}
      tabIndex={0}
      role="dialog"
      aria-label="Screensaver — click to dismiss"
    >
      <img
        src="/screensaver-vought.png"
        alt="Vought Productions — Production Paused"
        className="max-h-full max-w-full object-contain select-none"
        draggable={false}
      />
    </div>
  )
}
