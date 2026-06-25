'use client'

/*
 * MascotRive — AnggaMotion interactive cat, CC BY.
 * No state machine (it cycles keyboard/settings UI).
 * On load: plays "Setting_close" to dismiss the clipboard board, then
 * switches to grade-based animations once the board is gone.
 */

import { useEffect, useRef, useState } from 'react'
import { useRive } from '@rive-app/react-canvas'
import { useAppStore } from '@/store/use-app-store'
import { MascotPlaceholder } from './mascot-placeholder'

const RIV_SRC = '/animations/chip.riv'

type Mood = 'alert' | 'focus' | 'good' | 'great'

function getMood(missingCount: number, avgGrade: number): Mood {
  if (missingCount > 0) return 'alert'
  if (avgGrade >= 93)   return 'great'
  if (avgGrade >= 85)   return 'good'
  return 'focus'
}

const MOOD_LOOP: Record<Mood, string> = {
  alert:  'Inside box',
  focus:  'idle',
  good:   'Anim 02',
  great:  'idle',
}

const MOOD_INTRO: Partial<Record<Mood, string>> = {
  alert: 'Go inside box',
}

type Props = {
  size?: number
  missingCount?: number
  avgGrade?: number
}

export function MascotRive({ size = 96, missingCount = 0, avgGrade = 80 }: Props) {
  const reducedMotion = useAppStore((s) => s.reducedMotion)
  const [riveFailed, setRiveFailed] = useState(false)
  const [riveLoaded, setRiveLoaded] = useState(false)
  const [chipReady, setChipReady] = useState(false)
  const prevMoodRef = useRef<Mood | null>(null)
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const skip = reducedMotion || riveFailed

  const { rive, RiveComponent } = useRive(
    skip ? null : {
      src: RIV_SRC,
      autoplay: false,
      onLoadError: () => setRiveFailed(true),
      onLoad:      () => setRiveLoaded(true),
    }
  )

  // Phase 1: dismiss the settings board on first load
  useEffect(() => {
    if (!rive || !riveLoaded) return
    rive.resizeDrawingSurfaceToCanvas()
    rive.play('Setting_close')
    const t = setTimeout(() => setChipReady(true), 900)
    return () => clearTimeout(t)
  }, [rive, riveLoaded])

  // Phase 2: grade-based animations once the board is gone
  useEffect(() => {
    if (!rive || !chipReady) return

    const mood  = getMood(missingCount, avgGrade)
    const loop  = MOOD_LOOP[mood]
    const intro = MOOD_INTRO[mood]

    if (prevMoodRef.current === mood) {
      if (!rive.isPlaying) rive.play(loop)
      return
    }
    prevMoodRef.current = mood

    if (moodTimerRef.current) clearTimeout(moodTimerRef.current)

    if (intro) {
      rive.stop(); rive.play(intro)
      moodTimerRef.current = setTimeout(() => {
        if (rive) { rive.stop(); rive.play(loop) }
      }, 1200)
    } else {
      rive.stop(); rive.play(loop)
    }

    return () => { if (moodTimerRef.current) clearTimeout(moodTimerRef.current) }
  }, [rive, chipReady, missingCount, avgGrade])

  if (skip) return <MascotPlaceholder size={size} />

  return (
    <div
      style={{ width: size, height: size, overflow: 'hidden', position: 'relative' }}
      aria-label="Chip — the Better Schoology mascot"
      role="img"
    >
      {/* Placeholder fades out once the board has closed */}
      <div
        style={{
          position: 'absolute', inset: 0,
          opacity: chipReady ? 0 : 1,
          transition: 'opacity 0.4s',
          pointerEvents: 'none',
        }}
      >
        <MascotPlaceholder size={size} />
      </div>

      <div
        style={{
          position: 'absolute', inset: 0,
          clipPath: 'inset(0 0 30% 0)',
          opacity: chipReady ? 1 : 0,
          transition: 'opacity 0.4s',
        }}
      >
        <RiveComponent style={{ width: '100%', height: '100%' }} aria-hidden="true" />
      </div>
    </div>
  )
}
