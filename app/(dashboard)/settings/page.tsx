import type { Metadata } from 'next'
import { SettingsClient } from '@/components/settings/settings-client'

export const metadata: Metadata = {
  title: 'Settings — Better Schoology',
}

export default function SettingsPage() {
  return <SettingsClient />
}
