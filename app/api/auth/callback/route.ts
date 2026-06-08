import { NextResponse } from 'next/server'
import { createOAuthClient, saveTokens, type StoredTokens } from '@/lib/gmail/auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?gmail=denied`
    )
  }

  if (!code) {
    return NextResponse.json({ error: 'No code returned from Google' }, { status: 400 })
  }

  try {
    const client = createOAuthClient()
    const { tokens } = await client.getToken(code)
    saveTokens(tokens as StoredTokens)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?gmail=connected`
    )
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
