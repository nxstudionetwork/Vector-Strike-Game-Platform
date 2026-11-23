/** Grouped, collapsible sidebar (tablet + desktop). Collapsed items show tooltips. */
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Flame } from 'lucide-react'
import { XPBar } from '@/components/ui/XPBar'
import { useUser } from '@/features/auth/AuthProvider'
import { formatNumber } from '@/lib/format'
import { NAV_GROUPS, isSectionActive } from './navItems'
import styles from './DesktopSidebar.module.css'

export function DesktopSidebar({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { stats } = useUser()

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`} aria-label={t('nav.main')}>
      <nav className={styles.nav} aria-label={t('nav.main')}>
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className={styles.group} role="group" aria-labelledby={`nav-${group.id}`}>
            <p id={`nav-${group.id}`} className={styles.groupLabel}>
              {t(group.labelKey)}
            </p>
            <ul className={styles.list}>
              {group.items.map((item) => {
                const active = isSectionActive(item, pathname)
                const label = t(item.labelKey)
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`${styles.link} ${active ? styles.active : ''}`}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? label : undefined}
                      data-tooltip={collapsed ? label : undefined}
                    >
                      <item.icon size={21} aria-hidden="true" />
                      <span className={styles.label}>{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.footer}>
        {collapsed ? (
          <span className={styles.miniLevel} title={t('common.level', { level: stats.level })}>
            {stats.level}
          </span>
        ) : (
          <div className={styles.levelCard}>
            <XPBar stats={stats} size="sm" showLabels={false} />
            <div className={styles.levelRow}>
              <strong>{t('common.level', { level: stats.level })}</strong>
              <span>
                <Flame size={14} aria-hidden="true" /> {formatNumber(stats.current_streak)}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
