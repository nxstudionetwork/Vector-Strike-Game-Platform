import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, WifiOff } from 'lucide-react'
import { ApiError } from '@/lib/api/client'
import { Button } from './Button'
import { Spinner } from './Spinner'
import styles from './Feedback.module.css'

export function ProgressBar({
  value,
  label,
  size = 'md',
  tone = 'xp',
}: {
  value: number
  label: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'xp' | 'success' | 'accent'
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={`${styles.bar} ${styles[size]}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className={`${styles.fill} ${styles[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number | string; width?: number | string; radius?: number }) {
  return <span className={styles.skeleton} style={{ height, width, borderRadius: radius } as CSSProperties} aria-hidden="true" />
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  compact,
}: {
  icon?: ReactNode
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`${styles.empty} ${compact ? styles.compact : ''}`}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <h3 className={styles.emptyTitle}>{title}</h3>
      {body && <p className={styles.emptyBody}>{body}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, compact }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const { t } = useTranslation()
  const offline = (error instanceof ApiError && error.isNetwork) || (typeof navigator !== 'undefined' && !navigator.onLine)
  return (
    <EmptyState
      compact={compact}
      icon={offline ? <WifiOff size={28} /> : <AlertTriangle size={28} />}
      title={offline ? t('errors.offline') : t('errors.generic')}
      body={offline ? t('errors.offlineBody') : error instanceof ApiError && error.status < 500 ? error.message : t('errors.genericBody')}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )
      }
    />
  )
}

export function PageLoader({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div className={styles.pageLoader}>
      <Spinner size={28} label={label ?? t('common.loading')} />
    </div>
  )
}
