/**
 * The persistent application frame, composed from:
 *   Header (brand, search, notifications, profile menu)
 *   DesktopSidebar (tablet/desktop, collapsible; remembered per device)
 *   page content + AppFooter
 *   MobileNavigation (phones: bottom bar + More sheet)
 *
 * Breakpoints: < 768 phone · 768–1199 tablet (sidebar starts collapsed) · ≥ 1200 desktop.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'
import { useOnline } from '@/lib/useOnline'
import { AppFooter } from './AppFooter'
import { DesktopSidebar } from './DesktopSidebar'
import { Header } from './Header'
import { MobileNavigation } from './MobileNavigation'
import styles from './AppShell.module.css'

const STORAGE_KEY = 'vs.sidebarCollapsed'

function readCollapsed(): boolean {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved !== null) return saved === '1'
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia('(max-width: 1199px)').matches
}

export default function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const outlet = useOutlet()
  const online = useOnline()
  const mainRef = useRef<HTMLElement>(null)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, c ? '0' : '1')
      } catch {
        /* storage unavailable */
      }
      return !c
    })
  }, [])

  // New page: start at the top and move focus for screen-reader users.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className={styles.shell} data-collapsed={collapsed || undefined}>
      <a href="#main" className="skip-link">
        {t('nav.skipToContent')}
      </a>
      <Header collapsed={collapsed} onToggleSidebar={toggle} />
      <div className={styles.body}>
        <DesktopSidebar collapsed={collapsed} />
        <div className={styles.column}>
          {!online && (
            <div className={styles.offline} role="status">
              <WifiOff size={16} aria-hidden="true" /> {t('errors.offlineBody')}
            </div>
          )}
          <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
            {/* Keyed so each route mounts fresh with a CSS enter animation; never blocks navigation. */}
            <div key={location.pathname} className={styles.page}>
              {outlet}
            </div>
            <AppFooter />
          </main>
        </div>
      </div>
      <MobileNavigation />
    </div>
  )
}
