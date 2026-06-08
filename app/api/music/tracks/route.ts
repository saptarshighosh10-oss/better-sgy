import { spawn } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function runScript(script: string, timeoutMs = 10000): Promise<string> {
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

export async function GET(req: NextRequest) {
  const playlist = req.nextUrl.searchParams.get('playlist') ?? ''
  if (!playlist) return NextResponse.json({ tracks: [] })

  const safe = playlist.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const script = `
tell application "Music"
  try
    set pl to playlist "${safe}"
    -- Looping directly over "every track of pl" re-evaluates that expression
    -- each iteration and silently yields wrong/duplicated entries for larger
    -- playlists. Collecting into a list and joining with text item delimiters
    -- avoids that — but the joined value MUST be stored in a variable that
    -- isn't named "result": AppleScript treats "result" as a special implicit
    -- variable, and assigning the joined text to it silently breaks the
    -- returned value (it comes back empty).
    set trackList to (every track of pl)
    set entries to {}
    repeat with t in trackList
      try
        set end of entries to ((name of t) & "~" & (artist of t))
      end try
    end repeat
    set AppleScript's text item delimiters to "|||"
    set joinedOut to entries as text
    set AppleScript's text item delimiters to ""
    return joinedOut
  on error errMsg
    return "error:" & errMsg
  end try
end tell
`

  try {
    const raw = await runScript(script)
    if (!raw || raw.startsWith('error:')) {
      return NextResponse.json({ tracks: [] })
    }
    const tracks = raw.split('|||').map((s) => {
      const tilde = s.indexOf('~')
      const title  = tilde >= 0 ? s.slice(0, tilde).trim() : s.trim()
      const artist = tilde >= 0 ? s.slice(tilde + 1).trim() : ''
      return { title, artist }
    }).filter(t => t.title)
    return NextResponse.json({ tracks: tracks.slice(0, 200) })
  } catch {
    return NextResponse.json({ tracks: [] })
  }
}
