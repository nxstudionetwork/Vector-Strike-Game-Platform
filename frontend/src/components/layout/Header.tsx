/**
 * Global header: brand (→ Home) + sidebar toggle | search | streak, level,
 * notifications, profile menu. On phones search opens as a sheet.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flame, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import { Logo, LogoMark } from '@/components/ui/Logo'
import { useUser } from '@/features/auth/AuthProvider'
import { formatNumber } from '@/lib/format'
import { GlobalSearch } from './GlobalSearch'
import { NotificationButton, ProfileMenu } from './HeaderMenus'
import styles from './Header.module.css'

export function Header({ collapsed, onToggleSidebar }: { collapsed: boolean; onToggleSidebar: () => void }) {
  const { t } = useTranslation()
  const { stats } = useUser()
  const [mobileSearch, setMobileSearch] = useState(false)

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.toggle}`}
          onClick={onToggleSidebar}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-pressed={collapsed}
        >
          {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
        </button>
        <Link to="/home" className={styles.brand} aria-label={t('brand.name')}>
          <span className={styles.brandFull}>
            <Logo size={28} />
          </span>
          <span className={styles.brandMark}>
            <LogoMark size={30} />
          </span>
        </Link>
      </div>

      <div className={styles.center}>
        <GlobalSearch />
      </div>

      <div className={styles.right}>
        <button type="button" className={`${styles.iconButton} ${styles.searchButton}`} aria-label={t('search.open')} onClick={() => setMobileSearch(true)}>
          <Search size={20} aria-hidden="true" />
        </button>
        <span className={styles.pill} title={t('home.stat.streak')}>
          <Flame size={16} aria-hidden="true" className={stats.current_streak ? styles.flameOn : ''} />
          <span className="visually-hidden">{t('home.stat.streak')}:</span>
          {formatNumber(stats.current_streak)}
        </span>
        <Link to="/progress" className={`${styles.pill} ${styles.levelPill}`} title={t('nav.progress')}>
          {t('common.levelShort', { level: stats.level })}
        </Link>
        <NotificationButton />
        <ProfileMenu />
      </div>

      {mobileSearch && (
        <div className={styles.searchSheet}>
          <GlobalSearch autoFocus onNavigate={() => setMobileSearch(false)} />
          <button type="button" className={styles.iconButton} onClick={() => setMobileSearch(false)} aria-label={t('search.close')}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      )}
    </header>
  )
}
