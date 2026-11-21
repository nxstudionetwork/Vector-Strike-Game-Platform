import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, Target, Trophy, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Surfaces'
import { meApi } from '@/lib/api/endpoints'
import type { AppNotification } from '@/lib/api/types'
import { formatRelative } from '@/lib/format'
import { qk, useNotifications } from '@/lib/queries'
import styles from './NotificationsPage.module.css'

const ICONS: Record<AppNotification['kind'], typeof Bell> = {
  achievement: Trophy,
  level_up: Zap,
  daily_challenge: Target,
  system: Bell,
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const query = useNotifications()

  async function markAll() {
    await meApi.markNotificationsRead()
    await client.invalidateQueries({ queryKey: qk.notifications })
  }

  async function markOne(n: AppNotification) {
    if (n.is_read) return
    await meApi.markNotificationsRead([n.id]).catch(() => undefined)
    void client.invalidateQueries({ queryKey: qk.notifications })
  }

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        action={
          query.data && query.data.unread > 0 ? (
            <Button variant="secondary" size="sm" icon={<CheckCheck size={16} aria-hidden="true" />} onClick={markAll}>
              {t('notifications.markAll')}
            </Button>
          ) : undefined
        }
      />
      {query.isPending ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={72} radius={14} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <EmptyState icon={<Bell size={26} />} title={t('notifications.empty')} body={t('notifications.emptyBody')} />
      ) : (
        <ul className={styles.list}>
          {query.data.results.map((n) => {
            const KindIcon = ICONS[n.kind] ?? Bell
            const body = (
              <>
                <span className={styles.icon} aria-hidden="true">
                  <KindIcon size={18} />
                </span>
                <span className={styles.text}>
                  <strong>{n.title}</strong>
                  {n.body && <span>{n.body}</span>}
                </span>
                <time className={styles.time} dateTime={n.created_at}>
                  {formatRelative(n.created_at)}
                </time>
                {!n.is_read && <span className={styles.dot} aria-label="unread" />}
              </>
            )
            return (
              <li key={n.id} className={n.is_read ? styles.read : ''}>
                {n.link ? (
                  <Link to={n.link} className={styles.item} onClick={() => markOne(n)}>
                    {body}
                  </Link>
                ) : (
                  <div className={styles.item}>{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
