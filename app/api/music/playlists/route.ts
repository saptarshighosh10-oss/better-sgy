import { spawn } from 'child_process'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Gets user-created playlist names from Apple Music.
// Uses ||| separator so playlist names with commas are handled correctly.
const SCRIPT = `
tell application "System Events"
  if not ((name of processes) contains "Music") then return ""
end tell
tell application "Music"
  set sep to "|||"
  set result to ""
  try
    repeat with pl in every user playlist
      try
        if (special kind of pl) is none then
          if result is "" then
            set result to name of pl
          else
            set result to result & sep & (name of pl)
          end if
        end if
      end try
    end repeat
  end try
  return result
end tell
`

export async function GET(): Promise<Response> {
  return new Promise((resolve) => {
    const proc = spawn('osascript', ['-'])
    const timer = setTimeout(() => {
      proc.kill()
      resolve(NextResponse.json({ playlists: [] }))
    }, 8000)

    let out = ''
    proc.stdout.on('data', (b: Buffer) => { out += b.toString() })
    proc.on('close', () => {
      clearTimeout(timer)
      const names = out.trim()
        ? out.trim().split('|||').map((s) => s.trim()).filter(Boolean)
        : []
      resolve(NextResponse.json({ playlists: names.slice(0, 100) }))
    })
    proc.on('error', () => {
      clearTimeout(timer)
      resolve(NextResponse.json({ playlists: [] }))
    })
    proc.stdin.write(SCRIPT)
    proc.stdin.end()
  })
}
