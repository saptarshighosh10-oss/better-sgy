'use client'

import { useEffect } from 'react'
import { LampGlow } from '@/components/shared/lamp-glow'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Better Schoology] Unhandled error:', error)
  }, [error])

  return (
    <div
      className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-5 py-16 text-center"
      style={{ animation: 'detail-in 0.32s cubic-bezier(0.22,1,0.36,1) both' }}
    >
      <LampGlow />

      {/* Icon */}
      <div className="relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 card-press">
        <svg
          viewBox="0 0 24 24" width="34" height="34" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-destructive" aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <p className="relative z-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Unexpected Error
      </p>
      <h1 className="relative z-10 mt-1 text-lg font-semibold text-foreground">
        Something went wrong.
      </h1>
      <p className="relative z-10 mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
        The app hit an error it couldn't recover from. This is probably a one-time thing.
      </p>

      {error.digest && (
        <p className="relative z-10 mt-3 rounded-md border border-border bg-muted/40 px-3 py-1 font-mono text-[10px] text-muted-foreground/60">
          {error.digest}
        </p>
      )}

      <div className="relative z-10 mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="card-press inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.77" />
          </svg>
          Try again
        </button>
        <a
          href="/"
          className="card-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Back to overview
        </a>
      </div>
    </div>
  )
}
