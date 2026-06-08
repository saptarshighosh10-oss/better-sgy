import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GradeGraphClient } from '@/components/gradegraph/gradegraph-client'

export const metadata: Metadata = {
  title: 'GradeGraph — Better Schoology',
}

export default function GradeGraphPage() {
  return (
    <Suspense>
      <GradeGraphClient />
    </Suspense>
  )
}
