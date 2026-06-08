import { spawn } from 'child_process'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function runScript(script: string, timeoutMs = 4000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('osascript', ['-'])
    const timer = setTimeout(() => { proc.kill(); reject(new Error('timeout')) }, timeoutMs)
    let out = ''
    proc.stdout.on('data', (b: Buffer) => { out += b.toString() })
    proc.on('close', (code) => {
      clearTimeout(timer)
      code === 0 ? resolve(out.trim()) : reject(new Error(`exit ${code}`))
    })
    proc.on('error', (e) => { clearTimeout(timer); reject(e) })
    proc.stdin.write(script)
    proc.stdin.end()
  })
}

// Returns "not_running" | "stopped" | "title|||artist|||album|||pos|||dur|||state" | "error:<msg>"
const MUSIC_SCRIPT = `
tell application "System Events"
  if not ((name of processes) contains "Music") then return "not_running"
end tell
tell application "Music"
  try
    if player state is stopped then return "stopped"
    set t to current track
    try
      set pos to player position
    on error
      set pos to 0
    end try
    try
      set dur to duration of t
    on error
      set dur to 0
    end try
    set playState to "paused"
    if player state is playing then set playState to "playing"
    set curPlaylist to ""
    try
      set curPlaylist to name of current playlist
    end try
    return (name of t) & "|||" & (artist of t) & "|||" & (album of t) & "|||" & (pos as text) & "|||" & (dur as text) & "|||" & playState & "|||" & curPlaylist
  on error errMsg
    return "error:" & errMsg
  end try
end tell
`

// Same structure; also appends artwork URL as 7th segment for Spotify
const SPOTIFY_SCRIPT = `
tell application "System Events"
  if not ((name of processes) contains "Spotify") then return "not_running"
end tell
tell application "Spotify"
  try
    if player state is stopped then return "stopped"
    set t to current track
    try
      set pos to player position
    on error
      set pos to 0
    end try
    try
      set dur to duration of t
    on error
      set dur to 0
    end try
    try
      set artUrl to artwork url of t
    on error
      set artUrl to ""
    end try
    set playState to "paused"
    if player state is playing then set playState to "playing"
    return (name of t) & "|||" & (artist of t) & "|||" & (album of t) & "|||" & (pos as text) & "|||" & (dur as text) & "|||" & playState & "|||" & artUrl
  on error errMsg
    return "error:" & errMsg
  end try
end tell
`

type PlayerResult = {
  player: 'music' | 'spotify'
  isPlaying: boolean
  track: { title: string; artist: string; album: string; artworkUrl?: string } | null
  position: number
  duration: number
  currentPlaylist?: string
}

function parseTrack(raw: string, player: 'music' | 'spotify'): PlayerResult | null {
  if (!raw || raw === 'not_running') return null

  // App running but nothing queued, or automation permission denied → idle state
  if (raw === 'stopped' || raw.startsWith('error:')) {
    if (raw.startsWith('error:')) {
      console.error(`[music/status] ${player} osascript error:`, raw.slice(6).trim())
      console.error('[music/status] Tip: grant Automation permission for Music in System Settings → Privacy → Automation')
    }
    return { player, isPlaying: false, track: null, position: 0, duration: 0 }
  }

  const p = raw.split('|||')
  if (p.length < 6) return null
  return {
    player,
    isPlaying: p[5] === 'playing',
    track: {
      title:      p[0] ?? '',
      artist:     p[1] ?? '',
      album:      p[2] ?? '',
      artworkUrl: player === 'spotify' && p[6]?.trim() ? p[6].trim() : undefined,
    },
    position: parseFloat(p[3]) || 0,
    duration: parseFloat(p[4]) || 0,
    currentPlaylist: player === 'music' ? (p[6]?.trim() || undefined) : undefined,
  }
}

export async function GET() {
  // Apple Music first — preferred on Mac
  try {
    const raw = await runScript(MUSIC_SCRIPT)
    if (raw !== 'not_running') {
      const r = parseTrack(raw, 'music')
      if (r) return NextResponse.json(r)
    }
  } catch { /* not running or automation permission denied */ }

  // Spotify fallback
  try {
    const raw = await runScript(SPOTIFY_SCRIPT)
    if (raw !== 'not_running') {
      const r = parseTrack(raw, 'spotify')
      if (r) return NextResponse.json(r)
    }
  } catch { /* not running */ }

  return NextResponse.json({ player: null, isPlaying: false, track: null, position: 0, duration: 0 })
}
