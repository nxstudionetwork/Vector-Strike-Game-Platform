import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './AppFooter.module.css'

/** Compact support footer for signed-in pages. */
export function AppFooter() {
  const { t } = useTranslation()
  return (
    <footer className={styles.footer}>
      <nav aria-label={t('nav.help')} className={styles.links}>
        <Link to="/help">{t('footer.help')}</Link>
        <Link to="/accessibility">{t('footer.accessibility')}</Link>
        <Link to="/privacy">{t('footer.privacy')}</Link>
        <Link to="/terms">{t('footer.terms')}</Link>
      </nav>
      <p className={styles.copy}>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
    </footer>
  )
}
