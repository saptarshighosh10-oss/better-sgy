'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RefreshState } from '@/lib/types'
import { mockEmails } from '@/lib/mock-data'

export type AppPreset =
  | 'butcher'
  | 'neutral'
  | 'allen'
  | 'cyberpunk'
  | 'minecraft'
  | 'stranger-things'
  | 'arcane'

type AppStore = {
  selectedYearId: string
  selectedSemesterId: string
  refreshState: RefreshState
  lastUpdated: string
  theme: 'light' | 'dark'
  reducedMotion: boolean
  sidebarOpen: boolean
  unreadEmailCount: number
  readEmailIds: string[]
  musicVolume: number
  sfxVolume: number
  preset: AppPreset
  songInfoOpen: boolean
  showSpacePhoto: boolean
  showBookCard: boolean
  bookTitle: string

  setYear: (id: string) => void
  setSemester: (id: string) => void
  setRefreshState: (s: RefreshState) => void
  setLastUpdated: (ts: string) => void
  setTheme: (t: 'light' | 'dark') => void
  toggleTheme: () => void
  setReducedMotion: (v: boolean) => void
  toggleSidebar: () => void
  setSidebarOpen: (v: boolean) => void
  setUnreadEmailCount: (n: number) => void
  addReadEmailId: (id: string) => void
  setMusicVolume: (v: number) => void
  setSfxVolume: (v: number) => void
  setPreset: (p: AppPreset) => void
  setSongInfoOpen: (v: boolean) => void
  setShowSpacePhoto: (v: boolean) => void
  setShowBookCard: (v: boolean) => void
  setBookTitle: (v: string) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      selectedYearId: 'yr-2025-2026',
      selectedSemesterId: 'sem-2025-2026-s2',
      refreshState: 'fresh',
      lastUpdated: '2026-03-20T09:48:00.000Z',
      theme: 'light',
      reducedMotion: false,
      sidebarOpen: false,
      unreadEmailCount: mockEmails.filter(e => e.unread).length,
      readEmailIds: [],
      musicVolume: 60,
      sfxVolume: 80,
      preset: 'butcher',
      songInfoOpen: false,
      showSpacePhoto: true,
      showBookCard: true,
      bookTitle: 'Romeo and Juliet',

      setYear: (id) => set({ selectedYearId: id }),
      setSemester: (id) => set({ selectedSemesterId: id }),
      setRefreshState: (s) => set({ refreshState: s }),
      setLastUpdated: (ts) => set({ lastUpdated: ts }),
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setReducedMotion: (v) => set({ reducedMotion: v }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      setUnreadEmailCount: (n) => set({ unreadEmailCount: n }),
      addReadEmailId: (id) =>
        set((s) => ({
          readEmailIds: s.readEmailIds.includes(id)
            ? s.readEmailIds
            : [...s.readEmailIds, id],
        })),
      setMusicVolume: (v) => set({ musicVolume: v }),
      setSfxVolume: (v) => set({ sfxVolume: v }),
      setPreset: (p) => set({ preset: p }),
      setSongInfoOpen: (v) => set({ songInfoOpen: v }),
      setShowSpacePhoto: (v) => set({ showSpacePhoto: v }),
      setShowBookCard: (v) => set({ showBookCard: v }),
      setBookTitle: (v) => set({ bookTitle: v }),
    }),
    {
      name: 'bs-store',
      // Only persist user preferences — not ephemeral UI state
      partialize: (s) => ({
        reducedMotion: s.reducedMotion,
        selectedYearId: s.selectedYearId,
        selectedSemesterId: s.selectedSemesterId,
        readEmailIds: s.readEmailIds,
        musicVolume: s.musicVolume,
        sfxVolume: s.sfxVolume,
        preset: s.preset,
        showSpacePhoto: s.showSpacePhoto,
        showBookCard: s.showBookCard,
        bookTitle: s.bookTitle,
      }),
    }
  )
)

// Writes persisted fields to the local data file (fire-and-forget)
export function syncToFile(patch: Partial<{
  reducedMotion: boolean
  selectedYearId: string
  selectedSemesterId: string
  readEmailIds: string[]
  musicVolume: number
  sfxVolume: number
}>) {
  fetch('/api/user-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).catch(() => {}) // best-effort; localStorage is the primary fallback
}
