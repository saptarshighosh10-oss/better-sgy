import { NextResponse } from 'next/server'
import { getAuthUrl, isConfigured } from '@/lib/gmail/auth'

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set in .env.local' },
      { status: 500 }
    )
  }
  return NextResponse.redirect(getAuthUrl())
}
