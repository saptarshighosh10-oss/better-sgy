'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'mono-light' | 'mono-dark' | 'mark' | 'eve' | 'thragg' | 'omni-man'
  | 'cyberpunk' | 'minecraft' | 'stranger-things' | 'arcane'

const ALL_THEMES: Theme[] = [
  'light', 'dark', 'mono-light', 'mono-dark',
  'mark', 'eve', 'thragg', 'omni-man',
  'cyberpunk', 'minecraft', 'stranger-things', 'arcane',
]

const ThemeContext = createContext<{
  theme: Theme
  cycleTheme: () => void
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}>({ theme: 'light', cycleTheme: () => {}, setTheme: () => {}, toggleTheme: () => {} })

function applyTheme(t: Theme) {
  const root = document.documentElement
  root.classList.remove(
    'dark', 'mono-light', 'mono-dark',
    'theme-mark', 'theme-eve', 'theme-thragg', 'theme-omni-man',
    'theme-cyberpunk', 'theme-minecraft', 'theme-stranger-things', 'theme-arcane',
  )
  if (t === 'dark')       root.classList.add('dark')
  if (t === 'mono-light') root.classList.add('mono-light')
  if (t === 'mono-dark')  { root.classList.add('mono-dark'); root.classList.add('dark') }
  // Invincible themes
  if (t === 'mark')       { root.classList.add('dark'); root.classList.add('theme-mark') }
  if (t === 'eve')        root.classList.add('theme-eve')
  if (t === 'thragg')     { root.classList.add('dark'); root.classList.add('theme-thragg') }
  if (t === 'omni-man')   root.classList.add('theme-omni-man')
  // Game / show themes
  if (t === 'cyberpunk')       { root.classList.add('dark'); root.classList.add('theme-cyberpunk') }
  if (t === 'minecraft')       root.classList.add('theme-minecraft')
  if (t === 'stranger-things') { root.classList.add('dark'); root.classList.add('theme-stranger-things') }
  if (t === 'arcane')          { root.classList.add('dark'); root.classList.add('theme-arcane') }
}

function persistTheme(t: Theme) {
  localStorage.setItem('bs-theme', t)
  // Cookie lets the server pre-apply the class on next load (no script needed)
  document.cookie = `bs-theme=${t};path=/;max-age=31536000;SameSite=Lax`
}

export function ThemeProvider({
  children,
  initialTheme = 'light',
}: {
  children: React.ReactNode
  initialTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  useEffect(() => {
    // Reconcile with localStorage in case it's more recent than the cookie
    const stored = localStorage.getItem('bs-theme') as Theme | null
    const resolved: Theme =
      stored && ALL_THEMES.includes(stored)
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    if (resolved !== initialTheme) {
      setThemeState(resolved)
      applyTheme(resolved)
      persistTheme(resolved)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setTheme(t: Theme) {
    setThemeState(t)
    applyTheme(t)
    persistTheme(t)
  }

  function cycleTheme() {
    const idx = ALL_THEMES.indexOf(theme)
    setTheme(ALL_THEMES[(idx + 1) % ALL_THEMES.length])
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
