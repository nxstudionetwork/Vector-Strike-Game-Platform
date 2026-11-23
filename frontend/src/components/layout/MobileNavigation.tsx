/** Phone navigation: bottom bar (4 primary sections + More) and a slide-up More sheet. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HelpCircle, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useDismiss } from '@/lib/useDismiss'
import { MOBILE_MORE, MOBILE_PRIMARY, isSectionActive } from './navItems'
import styles from './MobileNavigation.module.css'

export function MobileNavigation() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, sheetRef, [moreRef])

  // Close the sheet whenever the route changes.
  useEffect(() => setOpen(false), [pathname])

  const moreActive = MOBILE_MORE.some((i) => isSectionActive(i, pathname)) || pathname === '/help'

  return (
    <>
      {open && <div className={styles.scrim} aria-hidden="true" />}
      {open && (
        <div ref={sheetRef} className={styles.sheet} role="dialog" aria-label={t('nav.moreTitle')}>
          <div className={styles.grabber} aria-hidden="true" />
          <ul className={styles.sheetGrid}>
            {MOBILE_MORE.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={`${styles.sheetItem} ${isSectionActive(item, pathname) ? styles.sheetActive : ''}`}>
                  <item.icon size={22} aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link to="/help" className={`${styles.sheetItem} ${pathname === '/help' ? styles.sheetActive : ''}`}>
                <HelpCircle size={22} aria-hidden="true" />
                <span>{t('nav.help')}</span>
              </Link>
            </li>
          </ul>
          <button
            type="button"
            className={styles.logout}
            onClick={async () => {
              close()
              await logout()
              navigate('/welcome', { replace: true })
            }}
          >
            <LogOut size={18} aria-hidden="true" /> {t('nav.logout')}
          </button>
        </div>
      )}

      <nav aria-label={t('nav.main')} className={styles.bar}>
        {MOBILE_PRIMARY.map((item) => {
          const active = isSectionActive(item, pathname)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`${styles.link} ${active && !open ? styles.active : ''}`}
            >
              <item.icon size={22} aria-hidden="true" />
              <span>{t(item.shortKey ?? item.labelKey)}</span>
            </Link>
          )
        })}
        <button
          ref={moreRef}
          type="button"
          className={`${styles.link} ${open || moreActive ? styles.active : ''}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          <span>{t('nav.more')}</span>
        </button>
      </nav>
    </>
  )
}
