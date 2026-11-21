/**
 * The persistent application frame.
 *   < 768px   compact top bar + bottom navigation
 *   768–1199  icon rail sidebar + top bar
 *   >= 1200   full sidebar + top bar
 */
import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, Coins, Flame, Settings, WifiOff } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Logo, LogoMark } from '@/components/ui/Logo'
import { ProgressBar } from '@/components/ui/Feedback'
import { useUser } from '@/features/auth/AuthProvider'
import { useOnline } from '@/lib/useOnline'
import { formatCompact, formatNumber } from '@/lib/format'
import { useNotifications } from '@/lib/queries'
import { NAV_ITEMS } from './navItems'
import styles from './AppShell.module.css'

export default function AppShell() {
  const { t } = useTranslation()
  const user = useUser()
  const location = useLocation()
  const outlet = useOutlet()
  const online = useOnline()
  const notifications = useNotifications()
  const unread = notifications.data?.unread ?? 0
  const mainRef = useRef<HTMLElement>(null)
  const { stats, profile } = user
  const inGameZone = location.pathname.startsWith('/game')
  const isActiveFor = (to: string, isActive: boolean) => isActive || (to === '/game-zone' && inGameZone)

  // New page: start at the top and move focus for screen-reader users.
  useEffect(() => {
    window.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        {t('nav.skipToContent')}
      </a>

      <aside className={styles.sidebar}>
        <Link to="/home" className={styles.sideBrand} aria-label={t('brand.name')}>
          <span className={styles.brandFull}>
            <Logo size={30} />
          </span>
          <span className={styles.brandMark}>
            <LogoMark size={32} />
          </span>
        </Link>
        <nav aria-label={t('nav.main')} className={styles.sideNav}>
          {NAV_ITEMS.map(({ to, labelKey, icon: NavIcon }) => (
            <NavLink
              key={to}
              to={to}
              title={t(labelKey)}
              className={({ isActive }) => `${styles.sideLink} ${isActiveFor(to, isActive) ? styles.active : ''}`}
            >
              <NavIcon size={22} aria-hidden="true" />
              <span className={styles.sideLabel}>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sideFooter}>
          <div className={styles.sideLevel}>
            <div className={styles.sideLevelRow}>
              <strong>{t('common.level', { level: stats.level })}</strong>
              <span>{t('common.xp', { value: formatNumber(stats.total_xp) })}</span>
            </div>
            <ProgressBar
              value={stats.progress}
              size="sm"
              label={t('home.xpToNext', { value: stats.xp_to_next_level, level: stats.level + 1 })}
            />
          </div>
          <NavLink
            to="/settings"
            title={t('nav.settings')}
            className={({ isActive }) => `${styles.sideLink} ${isActive ? styles.active : ''}`}
          >
            <Settings size={22} aria-hidden="true" />
            <span className={styles.sideLabel}>{t('nav.settings')}</span>
          </NavLink>
        </div>
      </aside>

      <div className={styles.column}>
        <header className={styles.topbar}>
          <Link to="/home" className={styles.topBrand} aria-label={t('brand.name')}>
            <LogoMark size={30} />
          </Link>
          <div className={styles.topStats}>
            <span className={styles.pill} title={t('home.stat.streak')}>
              <Flame size={16} aria-hidden="true" className={stats.current_streak ? styles.flameOn : ''} />
              <span className="visually-hidden">{t('home.stat.streak')}:</span>
              {formatNumber(stats.current_streak)}
            </span>
            <span className={`${styles.pill} ${styles.coinPill}`} title={t('home.stat.coins')}>
              <Coins size={16} aria-hidden="true" className={styles.coin} />
              <span className="visually-hidden">{t('home.stat.coins')}:</span>
              {formatCompact(stats.coins)}
            </span>
            <span className={`${styles.pill} ${styles.levelPill}`}>{t('common.levelShort', { level: stats.level })}</span>
          </div>
          <div className={styles.topActions}>
            <Link
              to="/notifications"
              className={styles.iconButton}
              aria-label={unread ? t('notifications.unread', { count: unread }) : t('nav.notifications')}
            >
              <Bell size={20} aria-hidden="true" />
              {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link to="/settings" className={`${styles.iconButton} ${styles.mobileOnly}`} aria-label={t('nav.settings')}>
              <Settings size={20} aria-hidden="true" />
            </Link>
            <Link to="/profile" className={styles.profileButton} aria-label={t('nav.openProfile')}>
              <Avatar avatar={profile.avatar} size={36} />
              <span className={styles.profileName}>{profile.display_name}</span>
            </Link>
          </div>
        </header>

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
        </main>
      </div>

      <nav aria-label={t('nav.main')} className={styles.bottomNav}>
        {NAV_ITEMS.map(({ to, labelKey, shortKey, icon: NavIcon }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={t(labelKey)}
            className={({ isActive }) => `${styles.bottomLink} ${isActiveFor(to, isActive) ? styles.bottomActive : ''}`}
          >
            <NavIcon size={22} aria-hidden="true" />
            <span aria-hidden="true">{t(shortKey ?? labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
