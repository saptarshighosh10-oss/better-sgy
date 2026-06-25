'use client'

import { useAppStore } from '@/store/use-app-store'
import { Screensaver } from '@/components/screensaver/screensaver'

export function LayoutExtras() {
  const preset = useAppStore((s) => s.preset)
  if (preset !== 'butcher') return null
  return <Screensaver />
}
