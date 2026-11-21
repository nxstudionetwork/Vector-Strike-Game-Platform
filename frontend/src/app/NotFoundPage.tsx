import { useTranslation } from 'react-i18next'
import { Compass } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={<Compass size={28} />}
      title={t('errors.notFoundTitle')}
      body={t('errors.notFoundBody')}
      action={<ButtonLink to="/home">{t('errors.goHome')}</ButtonLink>}
    />
  )
}
