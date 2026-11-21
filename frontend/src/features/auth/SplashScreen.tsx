import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogoMark } from '@/components/ui/Logo'
import { useAuth } from './AuthProvider'
import styles from './SplashScreen.module.css'

export function SplashScreen() {
  const { t } = useTranslation()
  return (
    <div className={styles.splash} role="status" aria-live="polite">
      <div className={styles.glow} aria-hidden="true" />
      <LogoMark size={88} animated />
      <p className={styles.word}>
        VECTOR <span className="gradient-text">STRIKE</span>
      </p>
      <p className={styles.tagline}>{t('brand.tagline')}</p>
      <div className={styles.loader} aria-hidden="true">
        <span />
      </div>
      <span className="visually-hidden">{t('splash.loading')}</span>
    </div>
  )
}

/** "/" — shows the brand briefly while the session is restored, then routes. */
const MIN_SPLASH_MS = 900

export function LaunchRoute() {
  const { status, user } = useAuth()
  const [minElapsed, setMinElapsed] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setMinElapsed(true), reduced ? 0 : MIN_SPLASH_MS)
    return () => window.clearTimeout(timer)
  }, [])

  if (status === 'loading' || !minElapsed) return <SplashScreen />
  if (!user) return <Navigate to="/welcome" replace />
  return <Navigate to={user.profile.onboarding_completed ? '/home' : '/onboarding'} replace />
}
