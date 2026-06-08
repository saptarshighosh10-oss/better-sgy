'use client'

// sync icon by Mariana Cifuentes — CC BY — 1.8 KB, neutral line art
// https://lottiefiles.com/animations/sync-icon
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

const SYNC_URL =
  'https://assets-v2.lottiefiles.com/a/6d6ec6bc-1172-11ee-8eee-c764c24472d0/1GVzWIXvNc.lottie'

type Props = { size?: number; className?: string }

export function LottieSpinner({ size = 20, className }: Props) {
  return (
    <DotLottieReact
      src={SYNC_URL}
      loop
      autoplay
      style={{ width: size, height: size }}
      className={className}
    />
  )
}
