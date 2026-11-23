import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Surfaces'
import { useNotifications } from '@/lib/queries'
import { NotificationItem, useMarkNotificationsRead } from './NotificationItem'
import styles from './NotificationsPage.module.css'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const query = useNotifications()
  const markRead = useMarkNotificationsRead()

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        action={
          query.data && query.data.unread > 0 ? (
            <Button variant="secondary" size="sm" icon={<CheckCheck size={16} aria-hidden="true" />} onClick={() => markRead()}>
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
          {query.data.results.map((n) => (
            <li key={n.id}>
              <NotificationItem n={n} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
