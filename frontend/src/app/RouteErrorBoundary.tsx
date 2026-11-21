import { useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const { t } = useTranslation()
  if (import.meta.env.DEV) console.error(error)
  // A failed lazy chunk usually means a new deploy — a reload fixes it.
  return (
    <div style={{ padding: 'var(--gutter)', maxWidth: 640, margin: '10vh auto' }}>
      <EmptyState
        icon={<AlertTriangle size={28} />}
        title={t('errors.boundaryTitle')}
        body={t('errors.boundaryBody')}
        action={<Button onClick={() => window.location.reload()}>{t('errors.reload')}</Button>}
      />
    </div>
  )
}
