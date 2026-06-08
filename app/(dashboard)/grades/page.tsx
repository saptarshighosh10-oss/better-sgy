import type { Metadata } from 'next'
import { GradesClient } from '@/components/grades/grades-client'

export const metadata: Metadata = {
  title: 'Grades — Better Schoology',
}

export default function GradesPage() {
  return <GradesClient />
}
