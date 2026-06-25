import { NextResponse } from 'next/server'
import { getSemesterLog, isSemesterEndingSoon } from '@/lib/scraper/semester-log'

export const dynamic = 'force-dynamic'

export function GET() {
  const log     = getSemesterLog()
  const ending  = isSemesterEndingSoon(14)
  return NextResponse.json({ ...log, endingSoon: ending })
}
