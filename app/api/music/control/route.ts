import { spawn } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function runScript(script: string, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', ['-'])
    const timer = setTimeout(() => { proc.kill(); reject(new Error('timeout')) }, timeoutMs)
    proc.on('close', (code) => {
      clearTimeout(timer)
      code === 0 ? resolve() : reject(new Error(`exit ${code}`))
    })
    proc.on('error', (e) => { clearTimeout(timer); reject(e) })
    proc.stdin.write(script)
    proc.stdin.end()
  })
}

const SCRIPTS: Record<string, Record<string, string>> = {
  music: {
    toggle: 'tell application "Music" to playpause',
    next:   'tell application "Music" to next track',
    prev:   'tell application "Music" to previous track',
    repeat: `tell application "Music"
  if song repeat is off then
    set song repeat to all
  else if song repeat is all then
    set song repeat to one
  else
    set song repeat to off
  end if
end tell`,
  },
  spotify: {
    toggle: 'tell application "Spotify" to playpause',
    next:   'tell application "Spotify" to next track',
    prev:   'tell application "Spotify" to previous track',
  },
}

export async function POST(req: NextRequest) {
  let body: { action?: string; player?: string; playlist?: string; track?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const { action = '', player = '', playlist, track } = body

  // Play a named Apple Music playlist
  if (action === 'play-playlist' && player === 'music') {
    if (!playlist) return NextResponse.json({ error: 'No playlist name' }, { status: 400 })
    const safe = playlist.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    try {
      await runScript(`tell application "Music" to play playlist "${safe}"`)
      return NextResponse.json({ ok: true })
    } catch {
      return NextResponse.json({ error: 'Could not play playlist' }, { status: 500 })
    }
  }

  // Play a specific track within a playlist
  if (action === 'play-track' && player === 'music') {
    if (!playlist || !track) return NextResponse.json({ error: 'Missing playlist or track' }, { status: 400 })
    const safePl = playlist.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const safeTr = track.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    try {
      await runScript(`tell application "Music" to play track "${safeTr}" of playlist "${safePl}"`)
      return NextResponse.json({ ok: true })
    } catch {
      return NextResponse.json({ error: 'Could not play track' }, { status: 500 })
    }
  }

  // Shuffle a playlist: enable shuffle then play
  if (action === 'shuffle' && player === 'music') {
    if (!playlist) return NextResponse.json({ error: 'No playlist name' }, { status: 400 })
    const safe = playlist.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    try {
      await runScript(`
tell application "Music"
  set shuffle enabled to true
  play playlist "${safe}"
end tell
`)
      return NextResponse.json({ ok: true })
    } catch {
      return NextResponse.json({ error: 'Could not shuffle playlist' }, { status: 500 })
    }
  }

  const script = SCRIPTS[player]?.[action]
  if (!script) return NextResponse.json({ error: 'Unknown action or player' }, { status: 400 })

  try {
    await runScript(script)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Control failed — is the app open?' }, { status: 500 })
  }
}
