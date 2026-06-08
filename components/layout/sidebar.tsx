'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MascotRive } from '@/components/mascot/mascot-rive'
import { MASCOT_PRESETS } from '@/components/mascot/preset-mascots'
import { useAppStore } from '@/store/use-app-store'
import type { AppPreset } from '@/store/use-app-store'
import { useSchoolYears } from '@/lib/use-grades'
import { useTheme } from '@/components/theme/theme-provider'

const NAV_ITEMS = [
  {
    label: 'Overview',
    href: '/overview',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Grades',
    href: '/grades',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    label: 'Assignments',
    href: '/assignments',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    label: 'GradeGraph',
    href: '/gradegraph',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Grade Breaker',
    href: '/game',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="13" rx="4" />
        <path d="M8 12h4M10 10v4" />
        <circle cx="16" cy="11.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="18" cy="14" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Important Emails',
    href: '/emails',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
] as const

const SETTINGS_ITEM = {
  label: 'Settings',
  href: '/settings',
  icon: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen, selectedYearId, selectedSemesterId, unreadEmailCount } = useAppStore()
  const preset = useAppStore((s) => s.preset)
  const { theme, cycleTheme } = useTheme()

  const { schoolYears } = useSchoolYears()
  const selectedYear = schoolYears.find((y) => y.id === selectedYearId) ?? schoolYears[0]
  const selectedSemester = selectedYear?.semesters.find((s) => s.id === selectedSemesterId) ?? selectedYear?.semesters[0]
  const missingCount = selectedSemester
    ? selectedSemester.courses.flatMap(c =>
        c.categories.flatMap(cat =>
          cat.assignments.filter(a => a.status === 'missing' || a.status === 'late')
        )
      ).length
    : 0

  function NavLink({
    href,
    label,
    icon,
    badge,
  }: {
    href: string
    label: string
    icon: React.ReactNode
    badge?: number
  }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          active
            ? 'bg-sidebar-accent text-primary'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge != null && badge > 0 && (
          <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-sidebar-border bg-sidebar',
          'transition-transform duration-200 ease-in-out',
          'lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        {/* App wordmark */}
        <div className="flex h-12 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground select-none">
            BS
          </div>
          <span className="flex-1 text-sm font-semibold text-sidebar-foreground tracking-tight">
            Better Schoology
          </span>
          <button
            type="button"
            onClick={cycleTheme}
            className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            aria-label={
              theme === 'light'      ? 'Switch to dark mode' :
              theme === 'dark'       ? 'Switch to mono light (black & white)' :
              theme === 'mono-light' ? 'Switch to mono dark (white & black)' :
                                       'Switch to light mode'
            }
            title={
              theme === 'light'      ? 'Dark mode' :
              theme === 'dark'       ? 'Mono light' :
              theme === 'mono-light' ? 'Mono dark' :
                                       'Light mode'
            }
          >
            {theme === 'light' && (
              /* Moon → go to dark */
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            {theme === 'dark' && (
              /* Half-filled circle → go to mono light */
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3a9 9 0 0 1 0 18V3z" fill="currentColor" stroke="none" />
              </svg>
            )}
            {theme === 'mono-light' && (
              /* Filled circle (all black) → go to mono dark */
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" stroke="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
            {theme === 'mono-dark' && (
              /* Sun → go to light */
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="App sections">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
            Navigation
          </p>
          <ul className="space-y-0.5" role="list">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge={item.href === '/emails' ? unreadEmailCount : undefined}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Settings */}
        <div className="border-t border-sidebar-border px-3 pt-2 pb-2">
          <NavLink href={SETTINGS_ITEM.href} label={SETTINGS_ITEM.label} icon={SETTINGS_ITEM.icon} />
        </div>

        {/* Mascot */}
        <div className="border-t border-sidebar-border px-3 py-3">
          {preset === 'butcher' ? (
            <div
              className="overflow-hidden rounded-xl bg-black"
              style={{ animation: 'chip-float 4s ease-in-out infinite' }}
            >
              <img
                src="/mascot/butcher-chibi.png"
                alt=""
                aria-hidden="true"
                className="w-full object-contain"
              />
              <p className="pb-2 text-center text-[10px] text-white/40 select-none leading-tight">
                Oi Hughie, fetch me a beer
              </p>
            </div>
          ) : MASCOT_PRESETS[preset] ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-sidebar-accent/50 px-3 py-3">
              {(() => {
                const { Sprite, sidebarCaption } = MASCOT_PRESETS[preset]!
                return (
                  <>
                    <div style={{ animation: 'chip-float 3.6s ease-in-out infinite' }}>
                      <Sprite width={64} height={68} />
                    </div>
                    <p className="text-center text-[10px] text-muted-foreground/70 select-none leading-tight">
                      {sidebarCaption}
                    </p>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-sidebar-accent/50 px-3 py-3">
              <MascotRive size={64} missingCount={missingCount} />
              <p className="text-center text-[10px] text-muted-foreground/70 select-none leading-tight">
                Chip · your study sidekick
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
