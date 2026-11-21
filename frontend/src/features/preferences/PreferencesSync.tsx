/**
 * Applies the learner's display & accessibility settings to <html> so every
 * screen (and every future game) inherits them through CSS tokens.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { applyLanguage } from '@/i18n'
import { useAuth } from '@/features/auth/AuthProvider'

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const listener = () => setMatches(mql.matches)
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }, [query])
  return matches
}

export function PreferencesSync({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const s = user?.settings
  const prefersLight = useMedia('(prefers-color-scheme: light)')
  const prefersReduced = useMedia('(prefers-reduced-motion: reduce)')

  const theme = !s || s.theme === 'system' ? (s ? (prefersLight ? 'light' : 'dark') : 'dark') : s.theme
  const reduced = s?.motion === 'reduced' || ((!s || s.motion === 'system') && prefersReduced)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.motion = reduced ? 'reduced' : 'full'
    root.dataset.textSize = s?.text_size ?? 'default'
    root.dataset.contrast = s?.high_contrast ? 'high' : 'normal'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f6ff' : '#070b1a')
    applyLanguage(s?.language ?? 'en')
  }, [theme, reduced, s?.text_size, s?.high_contrast, s?.language])

  return <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
}
