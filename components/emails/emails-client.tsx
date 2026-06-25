'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { MockEmail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAppStore, syncToFile } from '@/store/use-app-store'
import { useConnection } from '@/lib/use-connection'

// ── Course color map (mirrors CSS vars) ────────────────────────────────────
const COURSE_COLOR: Record<string, string> = {
  'Biology Honors':         '#10b981',
  'Algebra 2 Honors':       '#6366f1',
  'English 1 / Literature': '#f59e0b',
  'Drama':                  '#f97316',
  'French 1':               '#8b5cf6',
  'Physical Education':     '#06b6d4',
  'PE':                     '#06b6d4',
}
const FRIEND_COLOR = '#64748b'

function avatarColor(e: MockEmail) {
  if (e.senderType === 'friend') return FRIEND_COLOR
  return (e.detectedClass && COURSE_COLOR[e.detectedClass]) ?? '#6366f1'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ── Empty / not-connected state ─────────────────────────────────────────────
function EmailsEmptyIcon({ kind }: { kind: 'spinner' | 'link' | 'mail' }) {
  if (kind === 'spinner') {
    return (
      <svg viewBox="0 0 20 20" width="22" height="22" fill="none" className="animate-spin text-muted-foreground" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
        <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'link') {
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  )
}

function EmailsEmptyState({ connected }: { connected: boolean | null }) {
  const copy =
    connected === null
      ? {
          icon: 'spinner' as const,
          heading: 'Checking your connection…',
          body: 'One moment — checking whether Gmail is connected.',
          cta: false,
        }
      : connected === false
      ? {
          icon: 'link' as const,
          heading: 'Connect your Gmail account',
          body: 'Sign in once from Settings and important emails from teachers and classmates will start showing up here automatically.',
          cta: true,
        }
      : {
          icon: 'mail' as const,
          heading: 'No important emails yet',
          body: "You're connected — once Gmail has messages worth surfacing here, they'll show up in this list.",
          cta: false,
        }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card">
        <EmailsEmptyIcon kind={copy.icon} />
      </div>
      <h2 className="text-sm font-semibold text-foreground">{copy.heading}</h2>
      <p className="mt-2 max-w-xs text-xs text-muted-foreground leading-relaxed">{copy.body}</p>
      {copy.cta && (
        <Link
          href="/settings"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go to Settings to connect
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  )
}

// ── Priority badge ──────────────────────────────────────────────────────────
function PriorityBadge({ p }: { p: 'High' | 'Med' | 'Low' }) {
  const cls = {
    High: 'bg-red-500/12 text-red-600 dark:text-red-400',
    Med:  'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    Low:  'bg-muted/80 text-muted-foreground',
  }[p]
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none', cls)}>
      {p}
    </span>
  )
}

// ── Email row in the list ───────────────────────────────────────────────────
function EmailRow({
  email,
  active,
  onSelect,
}: {
  email: MockEmail
  active: boolean
  onSelect: () => void
}) {
  const color = avatarColor(email)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors',
        active ? 'bg-primary/6' : 'hover:bg-muted/40'
      )}
    >
      {/* Avatar */}
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {initials(email.sender)}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              'truncate text-[12.5px]',
              email.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/70'
            )}
          >
            {email.sender}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {fmtDate(email.date)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          {email.unread && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          )}
          <span
            className={cn(
              'truncate text-[11.5px]',
              email.unread ? 'font-medium text-foreground/85' : 'text-muted-foreground'
            )}
          >
            {email.subject}
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5">
          <PriorityBadge p={email.priority} />
          {email.detectedClass && (
            <span className="truncate text-[10px] text-muted-foreground/65">
              {email.detectedClass}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Email detail pane ───────────────────────────────────────────────────────
function EmailDetail({ email }: { email: MockEmail }) {
  const color = avatarColor(email)
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-7 py-6">
      {/* Header row */}
      <div className="flex items-start gap-4 border-b border-border pb-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {initials(email.sender)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[13.5px] font-semibold text-foreground">{email.sender}</p>
              <p className="text-xs text-muted-foreground">{email.senderEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge p={email.priority} />
              <span className="text-xs tabular-nums text-muted-foreground">{fmtDate(email.date)}</span>
            </div>
          </div>

          {email.detectedClass && (
            <span
              className="mt-2 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {email.detectedClass}
            </span>
          )}
        </div>
      </div>

      {/* Subject */}
      <h2 className="mt-5 text-[15px] font-semibold text-foreground leading-snug">
        {email.subject}
      </h2>

      {/* Snippet body */}
      <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-foreground/80">
        {email.snippet}
      </p>

      {/* Metadata note */}
      <p className="mt-5 text-[11px] text-muted-foreground/55">
        Metadata preview only — full email is in Gmail.
      </p>

      {/* Gmail link */}
      <div className="mt-5">
        <a
          href={email.gmailLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open in Gmail
        </a>
      </div>
    </div>
  )
}

// ── Main client component ───────────────────────────────────────────────────
type Filter = 'all' | 'teachers' | 'friends' | 'unread' | 'high' | 'spam'

const FILTER_LABELS: Record<Filter, string> = {
  all:      'All',
  teachers: 'Teachers',
  friends:  'Friends',
  unread:   'Unread',
  high:     'High Priority',
  spam:     'Spam',
}

export function EmailsClient() {
  // Store reads must come before any useState that references them
  const setUnreadEmailCount = useAppStore(s => s.setUnreadEmailCount)
  const addReadEmailId      = useAppStore(s => s.addReadEmailId)
  const readEmailIds        = useAppStore(s => s.readEmailIds)

  const [emails, setEmails] = useState<MockEmail[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [gmailStatus, setGmailStatus] = useState<'loading' | 'real' | 'empty'>('loading')
  const [filter, setFilter] = useState<Filter>('all')
  const gmailConnected = useConnection('gmail')

  // Try to load real Gmail data on mount
  useEffect(() => {
    setGmailStatus('loading')
    fetch('/api/emails')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok' && Array.isArray(data.emails) && data.emails.length > 0) {
          const realEmails: MockEmail[] = data.emails.map((e: MockEmail) =>
            readEmailIds.includes(e.id) ? { ...e, unread: false } : e
          )
          setEmails(realEmails)
          setSelectedId(realEmails[0].id)
          setGmailStatus('real')
        } else {
          setGmailStatus('empty')
        }
      })
      .catch(() => setGmailStatus('empty'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function selectEmail(id: string) {
    setSelectedId(id)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, unread: false } : e))
    addReadEmailId(id)
    syncToFile({ readEmailIds: [...readEmailIds, id] })
  }

  const filtered = emails.filter(e => {
    if (filter === 'teachers') return e.senderType === 'teacher'
    if (filter === 'friends')  return e.senderType === 'friend'
    if (filter === 'spam')     return e.senderType === 'spam'
    if (filter === 'unread')   return e.unread
    if (filter === 'high')     return e.priority === 'High'
    // Default All view hides spam unless explicitly viewing the spam tab
    return e.senderType !== 'spam'
  })

  // Keep a valid selection when filter narrows the list
  useEffect(() => {
    if (filtered.length > 0 && !filtered.find(e => e.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = emails.find(e => e.id === selectedId) ?? null
  // Unread badge excludes spam (don't notify about spam)
  const unreadCount = emails.filter(e => e.unread && e.senderType !== 'spam').length

  // Keep sidebar badge in sync
  useEffect(() => { setUnreadEmailCount(unreadCount) }, [unreadCount, setUnreadEmailCount])

  if (gmailStatus !== 'real') {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Important Emails</span>
        </div>
        <EmailsEmptyState connected={gmailStatus === 'loading' ? null : gmailConnected} />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">

      {/* ── LEFT: email list ─────────────────────────────────────── */}
      <div className="flex w-[320px] shrink-0 flex-col overflow-hidden border-r border-border">

        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Important Emails</span>
            {unreadCount > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
            <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success">
              Gmail
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Refresh */}
            <button
              type="button"
              onClick={() => {
                setGmailStatus('loading')
                fetch('/api/scrape', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ target: 'gmail', action: 'refresh' }),
                }).then(() => {
                  // Poll until scrape finishes then reload emails
                  const poll = setInterval(() => {
                    fetch('/api/scrape').then(r => r.json()).then(s => {
                      if (!['opening_browser','waiting_login','scraping'].includes(s.gmail?.status ?? '')) {
                        clearInterval(poll)
                        fetch('/api/emails').then(r => r.json()).then(data => {
                          if (data.status === 'ok' && data.emails?.length) {
                            setEmails(data.emails.map((e: MockEmail) =>
                              readEmailIds.includes(e.id) ? { ...e, unread: false } : e
                            ))
                            setGmailStatus('real')
                          } else { setGmailStatus('real') }
                        }).catch(() => setGmailStatus('real'))
                      }
                    }).catch(() => { clearInterval(poll); setGmailStatus('real') })
                  }, 1500)
                }).catch(() => setGmailStatus('real'))
              }}
              title="Refresh from Gmail"
              className="flex items-center justify-center rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 overflow-x-auto px-3 py-2.5" style={{ scrollbarWidth: 'none' }}>
          {(Object.keys(FILTER_LABELS) as Filter[]).map(f => {
            const spamCount = f === 'spam' ? emails.filter(e => e.senderType === 'spam').length : 0
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  f === 'spam'
                    ? filter === 'spam'
                      ? 'bg-destructive/80 text-white'
                      : 'bg-destructive/10 text-destructive hover:bg-destructive/15'
                    : filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
              >
                {FILTER_LABELS[f]}
                {f === 'spam' && spamCount > 0 && (
                  <span className="ml-1 opacity-70">{spamCount}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Email rows */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No emails</p>
          ) : (
            filtered.map(email => (
              <EmailRow
                key={email.id}
                email={email}
                active={email.id === selectedId}
                onSelect={() => selectEmail(email.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: email detail ──────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {selected ? (
          <EmailDetail email={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select an email to read
          </div>
        )}
      </div>
    </div>
  )
}
