import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/Surfaces'
import styles from './Support.module.css'

export default function HelpPage() {
  const { t } = useTranslation()
  const faq = t('help.faq', { returnObjects: true }) as { q: string; a: string }[]
  return (
    <>
      <PageHeader title={t('help.title')} subtitle={t('help.subtitle')} />
      <div className={styles.faq}>
        {faq.map((item) => (
          <details key={item.q} className={styles.item}>
            <summary>
              {item.q}
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      <p className={styles.links}>
        <Link to="/accessibility">{t('footer.accessibility')}</Link> · <Link to="/privacy">{t('footer.privacy')}</Link> ·{' '}
        <Link to="/terms">{t('footer.terms')}</Link>
      </p>
    </>
  )
}
