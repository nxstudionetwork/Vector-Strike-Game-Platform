import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, Target, Trophy, Zap } from 'lucide-react'
import { meApi } from '@/lib/api/endpoints'
import type { AppNotification } from '@/lib/api/types'
import { formatRelative } from '@/lib/format'
import { qk } from '@/lib/queries'
import styles from './NotificationItem.module.css'

const ICONS: Record<AppNotification['kind'], typeof Bell> = {
  achievement: Trophy,
  level_up: Zap,
  daily_challenge: Target,
  system: Bell,
}

export function useMarkNotificationsRead() {
  const client = useQueryClient()
  return async (ids?: number[]) => {
    await meApi.markNotificationsRead(ids).catch(() => undefined)
    await client.invalidateQueries({ queryKey: qk.notifications })
  }
}

export function NotificationItem({ n, compact, onOpen }: { n: AppNotification; compact?: boolean; onOpen?: () => void }) {
  const { t } = useTranslation()
  const markRead = useMarkNotificationsRead()
  const KindIcon = ICONS[n.kind] ?? Bell
  const body = (
    <>
      <span className={`${styles.icon} ${styles[n.kind]}`} aria-hidden="true">
        <KindIcon size={18} />
      </span>
      <span className={styles.text}>
        <strong>{n.title}</strong>
        {n.body && !compact && <span>{n.body}</span>}
        <time dateTime={n.created_at}>{formatRelative(n.created_at)}</time>
      </span>
      {!n.is_read && (
        <span className={styles.dot}>
          <span className="visually-hidden">{t('notifications.unread', { count: 1 })}</span>
        </span>
      )}
    </>
  )
  const className = `${styles.item} ${n.is_read ? styles.read : ''} ${compact ? styles.compact : ''}`
  if (!n.link) return <div className={className}>{body}</div>
  return (
    <Link
      to={n.link}
      className={className}
      onClick={() => {
        if (!n.is_read) void markRead([n.id])
        onOpen?.()
      }}
    >
      {body}
    </Link>
  )
}
