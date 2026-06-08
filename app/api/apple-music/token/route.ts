import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const runtime = 'nodejs'

export function GET() {
  const teamId     = process.env.APPLE_MUSIC_TEAM_ID
  const keyId      = process.env.APPLE_MUSIC_KEY_ID
  let   privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY

  if (!teamId || !keyId || !privateKey) {
    return NextResponse.json({ error: 'Apple Music credentials not configured' }, { status: 503 })
  }

  // Support \n-escaped private key in .env.local
  privateKey = privateKey.replace(/\\n/g, '\n')

  const now      = Math.floor(Date.now() / 1000)
  const header   = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url')
  const payload  = Buffer.from(JSON.stringify({ iss: teamId, iat: now, exp: now + 15_777_000 })).toString('base64url')
  const sigInput = `${header}.${payload}`

  const signer = crypto.createSign('SHA256')
  signer.update(sigInput)
  // dsaEncoding: 'ieee-p1363' produces raw r||s (64 bytes) as ES256 requires
  const sig = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })

  return NextResponse.json({ token: `${sigInput}.${sig.toString('base64url')}` })
}
