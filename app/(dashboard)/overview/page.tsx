import type { Metadata } from 'next'
import { OverviewClient } from '@/components/overview/overview-client'

export const metadata: Metadata = {
  title: 'Overview — Better Schoology',
}

export default function OverviewPage() {
  return <OverviewClient />
}
