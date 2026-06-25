import type { Metadata } from 'next'
import { EmailsClient } from '@/components/emails/emails-client'

export const metadata: Metadata = {
  title: 'Important Emails — Better Schoology',
}

export default function EmailsPage() {
  return <EmailsClient />
}
