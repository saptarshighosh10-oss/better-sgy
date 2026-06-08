import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { ActivityData } from '@/lib/scraper/scrape-activity'

const ACTIVITY_PATH = path.join(process.cwd(), 'data', 'activity-data.json')

export async function GET() {
  try {
    if (!fs.existsSync(ACTIVITY_PATH)) {
      return NextResponse.json({ items: [], scrapedAt: null })
    }
    const data: ActivityData = JSON.parse(fs.readFileSync(ACTIVITY_PATH, 'utf-8'))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ items: [], scrapedAt: null })
  }
}
