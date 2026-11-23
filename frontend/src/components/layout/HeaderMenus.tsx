/** Header popovers: notification panel and profile menu. Both close on outside click / Escape. */
import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, LineChart, LogOut, Settings, Trophy, UserRound } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Spinner'
import { XPBar } from '@/components/ui/XPBar'
import { useAuth, useUser } from '@/features/auth/AuthProvider'
import { NotificationItem, useMarkNotificationsRead } from '@/features/notifications/NotificationItem'
import { useDismiss } from '@/lib/useDismiss'
import { useNotifications } from '@/lib/queries'
import styles from './HeaderMenus.module.css'

const PANEL_LIMIT = 6

export function NotificationButton() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const query = useNotifications()
  const markRead = useMarkNotificationsRead()
  const unread = query.data?.unread ?? 0
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, panelRef, [buttonRef])

  return (
    <div className={styles.anchor}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.iconButton}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? t('notifications.unread', { count: unread }) : t('nav.notifications')}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div ref={panelRef} className={`${styles.panel} ${styles.notifPanel}`} role="dialog" aria-label={t('notifications.panelTitle')}>
          <div className={styles.panelHead}>
            <h2>{t('notifications.panelTitle')}</h2>
            {unread > 0 && (
              <button type="button" className={styles.textButton} onClick={() => markRead()}>
                <CheckCheck size={16} aria-hidden="true" /> {t('notifications.markAll')}
              </button>
            )}
          </div>
          <div className={styles.panelBody}>
            {query.isPending ? (
              <div className={styles.center}>
                <Spinner />
              </div>
            ) : !query.data || query.data.results.length === 0 ? (
              <div className={styles.emptyNote}>
                <strong>{t('notifications.empty')}</strong>
                <span>{t('notifications.emptyBody')}</span>
              </div>
            ) : (
              <ul className={styles.notifList}>
                {query.data.results.slice(0, PANEL_LIMIT).map((n) => (
                  <li key={n.id}>
                    <NotificationItem n={n} compact onOpen={close} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link to="/notifications" className={styles.panelFoot} onClick={close}>
            {t('notifications.viewAll')}
          </Link>
        </div>
      )}
    </div>
  )
}

export function ProfileMenu() {
  const { t } = useTranslation()
  const user = useUser()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, close, panelRef, [buttonRef])

  const links = [
    { to: '/profile', label: t('nav.profile'), icon: UserRound },
    { to: '/progress', label: t('nav.progress'), icon: LineChart },
    { to: '/achievements', label: t('nav.achievements'), icon: Trophy },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  // Arrow-key movement between menu items.
  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <div className={styles.anchor}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.profileButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.openProfileMenu')}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 0)
          }
        }}
      >
        <Avatar avatar={user.profile.avatar} size={36} />
        <span className={styles.profileName}>{user.profile.display_name}</span>
      </button>
      {open && (
        <div ref={panelRef} className={`${styles.panel} ${styles.menuPanel}`} onKeyDown={onMenuKey}>
          <div className={styles.identity}>
            <Avatar avatar={user.profile.avatar} size={48} />
            <div className={styles.identityText}>
              <strong>{user.profile.display_name}</strong>
              <code>{user.profile.player_tag}</code>
            </div>
          </div>
          <div className={styles.xp}>
            <XPBar stats={user.stats} size="sm" />
          </div>
          <ul className={styles.menu} role="menu" aria-label={t('nav.openProfileMenu')}>
            {links.map((l) => (
              <li key={l.to} role="none">
                <Link to={l.to} role="menuitem" className={styles.menuItem} onClick={close}>
                  <l.icon size={18} aria-hidden="true" />
                  {l.label}
                </Link>
              </li>
            ))}
            <li role="none" className={styles.sep} />
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={async () => {
                  close()
                  await logout()
                  navigate('/welcome', { replace: true })
                }}
              >
                <LogOut size={18} aria-hidden="true" />
                {t('nav.logout')}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
