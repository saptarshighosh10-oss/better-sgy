'use client'

import { useAppStore } from '@/store/use-app-store'
import { MASCOT_PRESETS } from '@/components/mascot/preset-mascots'

type ChipState = 'alert' | 'focus' | 'good' | 'great'

type Props = {
  missingCount: number
  upcomingCount: number
  avgGrade: number
}

const BUTCHER_IMG: Record<ChipState, string> = {
  alert: '/mascot/butcher-angry.png',
  focus: '/mascot/butcher-smirk.png',
  good:  '/mascot/butcher-happy.png',
  great: '/mascot/butcher-happy.png',
}

const STATE_CONFIG: Record<ChipState, {
  title: string
  message: (p: Props) => string
  color: string
  tagBg: string
  tagText: string
  tagLabel: string
}> = {
  alert: {
    title: 'Heads up!',
    message: (p) =>
      `You have ${p.missingCount} assignment${p.missingCount !== 1 ? 's' : ''} that need${p.missingCount === 1 ? 's' : ''} attention. Check the To Do panel.`,
    color: 'text-destructive',
    tagBg: 'bg-destructive/10',
    tagText: 'text-destructive',
    tagLabel: 'Needs attention',
  },
  focus: {
    title: 'Stay on track.',
    message: (p) =>
      `${p.upcomingCount} assignment${p.upcomingCount !== 1 ? 's' : ''} due this week. Keep the momentum.`,
    color: 'text-primary',
    tagBg: 'bg-primary/10',
    tagText: 'text-primary',
    tagLabel: 'On track',
  },
  good: {
    title: 'All caught up.',
    message: (p) =>
      `Nothing overdue. Semester average sitting at ${p.avgGrade.toFixed(1)}%. Solid work.`,
    color: 'text-emerald-600 dark:text-emerald-400',
    tagBg: 'bg-emerald-500/10',
    tagText: 'text-emerald-600 dark:text-emerald-400',
    tagLabel: 'All clear',
  },
  great: {
    title: 'Crushing it.',
    message: (p) =>
      `Semester average ${p.avgGrade.toFixed(1)}% and nothing overdue. That's the grade you want.`,
    color: 'text-emerald-600 dark:text-emerald-400',
    tagBg: 'bg-emerald-500/10',
    tagText: 'text-emerald-600 dark:text-emerald-400',
    tagLabel: 'Outstanding',
  },
}

function resolveState(p: Props): ChipState {
  if (p.missingCount > 0) return 'alert'
  if (p.upcomingCount > 0) return 'focus'
  if (p.avgGrade >= 93) return 'great'
  return 'good'
}

export function ChipZone(props: Props) {
  const state  = resolveState(props)
  const config = STATE_CONFIG[state]
  const preset = useAppStore((s) => s.preset)
  const mascot = MASCOT_PRESETS[preset]

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-end gap-4 px-5 pt-2 pb-0">

        {/* Mascot — Butcher in butcher preset, hand-illustrated sprite for mascot presets, plain icon in neutral */}
        {preset === 'butcher' ? (
          <div className="shrink-0" style={{ height: 130 }}>
            <img
              key={state}
              src={BUTCHER_IMG[state]}
              alt=""
              aria-hidden="true"
              style={{
                height: 130, width: 'auto', objectFit: 'contain', objectPosition: 'bottom',
                animation: 'mascot-spring-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}
            />
          </div>
        ) : mascot ? (
          <div
            className="shrink-0 flex items-end pb-3"
            style={{ animation: 'mascot-spring-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) both' }}
          >
            <mascot.Sprite width={92} height={98} />
          </div>
        ) : (
          <div className="shrink-0 flex items-end pb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
          </div>
        )}

        {/* Message */}
        <div
          className="min-w-0 flex-1 pb-4"
          style={{ animation: 'chip-bubble-in 0.4s ease-out both' }}
        >
          <div className="mb-1.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${config.tagBg} ${config.tagText} rounded-full px-2 py-0.5`}>
              {config.tagLabel}
            </span>
          </div>
          <p className={`text-base font-semibold leading-tight ${config.color}`}>
            {config.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">
            {config.message(props)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
              Avg grade
              <span className="font-semibold text-foreground tabular-nums ml-0.5">
                {props.avgGrade.toFixed(1)}%
              </span>
            </span>
            {props.missingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-destructive/20 bg-destructive/8 px-2.5 py-1 text-[11px] text-destructive">
                {props.missingCount} missing
              </span>
            )}
            {props.upcomingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] text-primary">
                {props.upcomingCount} due this week
              </span>
            )}
            {props.missingCount === 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success shrink-0" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Nothing overdue
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
