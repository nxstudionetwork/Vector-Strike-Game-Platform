import { useTranslation } from 'react-i18next'
import { CheckCircle2, Settings } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Card, PageHeader } from '@/components/ui/Surfaces'
import styles from './Support.module.css'

export default function AccessibilityPage() {
  const { t } = useTranslation()
  const points = t('a11y.points', { returnObjects: true }) as string[]
  return (
    <>
      <PageHeader title={t('a11y.title')} subtitle={t('a11y.subtitle')} />
      <Card>
        <ul className={styles.points}>
          {points.map((p) => (
            <li key={p}>
              <CheckCircle2 size={20} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </Card>
      <ButtonLink to="/settings#s-a11y" variant="secondary" icon={<Settings size={18} aria-hidden="true" />} className={styles.cta}>
        {t('a11y.settingsLink')}
      </ButtonLink>
    </>
  )
}
