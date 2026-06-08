import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data', 'user-data.json')

export type UserData = {
  readEmailIds: string[]
  reducedMotion: boolean
  selectedYearId: string
  selectedSemesterId: string
}

const DEFAULTS: UserData = {
  readEmailIds: [],
  reducedMotion: false,
  selectedYearId: 'yr-2025-2026',
  selectedSemesterId: 'sem-2025-2026-s2',
}

export async function GET() {
  try {
    if (!fs.existsSync(DATA_PATH)) return NextResponse.json(DEFAULTS)
    const raw = fs.readFileSync(DATA_PATH, 'utf-8')
    return NextResponse.json({ ...DEFAULTS, ...JSON.parse(raw) })
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

export async function POST(req: Request) {
  try {
    const incoming: Partial<UserData> = await req.json()
    // Never overwrite with empty/bad data
    const existing: UserData = fs.existsSync(DATA_PATH)
      ? { ...DEFAULTS, ...JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) }
      : { ...DEFAULTS }
    const merged = { ...existing, ...incoming }
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
    fs.writeFileSync(DATA_PATH, JSON.stringify(merged, null, 2))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
