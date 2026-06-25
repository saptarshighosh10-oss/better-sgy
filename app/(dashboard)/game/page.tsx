import type { Metadata } from 'next'
import { GradeBreakerGame } from '@/components/game/grade-breaker-game'

export const metadata: Metadata = {
  title: 'Grade Breaker — Better Schoology',
}

export default function GamePage() {
  return (
    <div className="w-full px-5 py-5">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Arcade
        </p>
        <h1 className="mt-1 text-base font-semibold text-foreground">Grade Breaker</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Break your assignments. Ball speeds up with every hit.
        </p>
      </div>
      <GradeBreakerGame />
    </div>
  )
}
