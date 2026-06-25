import { NextResponse } from 'next/server'
import { getState, setState, isBusy } from '@/lib/scraper/state'
import type { ScrapeTarget } from '@/lib/scraper/sessions'
import { hasSession, clearSession } from '@/lib/scraper/sessions'
import { gmailDataAge } from '@/lib/gmail/../scraper/scrape-gmail'
import { schoologyDataAge } from '@/lib/scraper/scrape-schoology'
import { activityDataAge } from '@/lib/scraper/scrape-activity'
import { getNewActivityInfo } from '@/lib/scraper/activity-watch'

type Target = ScrapeTarget | 'activity'

// Activity uses the schoology session but its own in-memory state
let activityStatus: 'idle' | 'scraping' | 'done' | 'error' = 'idle'
let activityLastRun: number | null = null
let activityError: string | null = null

function statusPayload() {
  const sg = getState('schoology')
  const gm = getState('gmail')
  return {
    schoology: {
      ...sg,
      connected:   hasSession('schoology'),
      dataAgeMs:   schoologyDataAge(),
      lastSuccess: sg.lastSuccess,
      lastFailed:  sg.lastFailed,
    },
    gmail: {
      ...gm,
      connected:   hasSession('gmail'),
      dataAgeMs:   gmailDataAge(),
      lastSuccess: gm.lastSuccess,
      lastFailed:  gm.lastFailed,
    },
    activity: {
      status:    activityStatus,
      lastRun:   activityLastRun,
      error:     activityError,
      connected: hasSession('schoology'),
      dataAgeMs: activityDataAge(),
      newCount:  getNewActivityInfo().newCount,
    },
  }
}

export async function GET() {
  return NextResponse.json(statusPayload())
}

export async function POST(req: Request) {
  const { target, action }: { target: Target; action: 'connect' | 'refresh' | 'disconnect' } = await req.json()

  // Activity target: only supports 'refresh'
  if (target === 'activity') {
    if (activityStatus === 'scraping') {
      return NextResponse.json({ ok: false, reason: 'already_running', ...statusPayload() })
    }
    activityStatus = 'scraping'; activityError = null
    setImmediate(async () => {
      try {
        const { headlessScrapeActivity } = await import('@/lib/scraper/scrape-activity')
        await headlessScrapeActivity(() => {})
        activityStatus = 'done'; activityLastRun = Date.now(); activityError = null
      } catch (e) {
        activityStatus = 'error'; activityError = e instanceof Error ? e.message : String(e)
      }
    })
    return NextResponse.json({ ok: true, ...statusPayload() })
  }

  const scrapetarget = target as ScrapeTarget

  if (action === 'disconnect') {
    clearSession(scrapetarget)
    setState(scrapetarget, { status: 'idle', lastRun: null, error: null, connected: false })
    return NextResponse.json({ ok: true, ...statusPayload() })
  }

  if (isBusy(scrapetarget)) {
    return NextResponse.json({ ok: false, reason: 'already_running', ...statusPayload() })
  }

  setState(scrapetarget, { status: action === 'connect' ? 'opening_browser' : 'scraping', error: null })

  setImmediate(async () => {
    const now = Date.now()
    try {
      if (scrapetarget === 'gmail') {
        const { connectAndScrapeGmail, headlessScrapeGmail } = await import('@/lib/scraper/scrape-gmail')
        const fn = action === 'connect' ? connectAndScrapeGmail : headlessScrapeGmail
        await fn(s => setState('gmail', { status: s as any }))
        setState('gmail', { status: 'done', lastRun: now, lastSuccess: now, connected: true, error: null })
        console.log(`[scrape] gmail success at ${new Date(now).toISOString()}`)
      } else {
        const { connectAndScrapeSchoology, headlessScrapeSchoology } = await import('@/lib/scraper/scrape-schoology')
        const fn = action === 'connect' ? connectAndScrapeSchoology : headlessScrapeSchoology
        await fn(s => setState('schoology', { status: s as any }))
        setState('schoology', { status: 'done', lastRun: now, lastSuccess: now, connected: true, error: null })
        console.log(`[scrape] schoology success at ${new Date(now).toISOString()}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[scrape] ${scrapetarget} failed at ${new Date(now).toISOString()}: ${msg}`)
      setState(scrapetarget, { status: 'error', lastRun: now, lastFailed: now, error: msg })
    }
  })

  return NextResponse.json({ ok: true, ...statusPayload() })
}
