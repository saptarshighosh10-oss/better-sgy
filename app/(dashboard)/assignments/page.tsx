import type { Metadata } from 'next'
import { AssignmentsClient } from '@/components/assignments/assignments-client'

export const metadata: Metadata = {
  title: 'Assignments — Better Schoology',
}

export default function AssignmentsPage() {
  return <AssignmentsClient />
}
