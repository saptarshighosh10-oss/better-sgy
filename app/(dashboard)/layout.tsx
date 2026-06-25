import type { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ScrapeStatusBar } from '@/components/layout/scrape-status-bar'
import { ThemeSync } from '@/components/theme-sync'
import { MusicWidget } from '@/components/layout/music-widget'
import { LayoutExtras } from '@/components/layout/layout-extras'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ThemeSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <ScrapeStatusBar />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <MusicWidget />
      <LayoutExtras />
    </div>
  )
}
