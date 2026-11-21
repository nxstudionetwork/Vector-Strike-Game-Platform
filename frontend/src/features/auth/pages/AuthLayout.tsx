import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/ui/Logo'
import { UniverseArt } from './UniverseArt'
import styles from './Auth.module.css'

export function AuthLayout({ title, subtitle, children, footer }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className={styles.layout}>
      <aside className={styles.side} aria-hidden="true">
        <UniverseArt />
        <div className={styles.sideCopy}>
          <p className={styles.sideTagline}>{t('brand.tagline')}</p>
          <p className={styles.sideMission}>{t('brand.mission')}</p>
        </div>
      </aside>
      <main className={styles.main}>
        <Link to="/welcome" className={styles.brandLink}>
          <Logo size={30} />
        </Link>
        <motion.div
          className={styles.panel}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className={styles.header}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </header>
          {children}
          {footer && <div className={styles.footer}>{footer}</div>}
        </motion.div>
      </main>
    </div>
  )
}
