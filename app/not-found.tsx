import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-5 py-16 text-center">
      <p
        className="select-none text-[80px] font-bold tabular-nums leading-none text-muted-foreground/10"
        aria-hidden="true"
      >
        404
      </p>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Not Found
      </p>
      <h1 className="mt-1 text-lg font-semibold text-foreground">
        That page doesn't exist.
      </h1>
      <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
        Double-check the URL, or head back to the overview.
      </p>

      <Link
        href="/"
        className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        Go home
      </Link>
    </div>
  )
}
