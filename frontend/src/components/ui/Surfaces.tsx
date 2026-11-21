import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Surfaces.module.css'

export function Card({
  children,
  className,
  padded = true,
  glow,
  ...rest
}: { padded?: boolean; glow?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[styles.card, padded ? styles.padded : '', glow ? styles.glow : '', className ?? ''].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Section({
  title,
  subtitle,
  action,
  children,
  id,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  id?: string
}) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.sectionHead}>
        <div>
          <h2 id={headingId} className={styles.sectionTitle}>
            {title}
          </h2>
          {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
        </div>
        {action && <div className={styles.sectionAction}>{action}</div>}
      </div>
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function StatTile({
  icon,
  label,
  value,
  tone = 'accent',
}: {
  icon: ReactNode
  label: ReactNode
  value: ReactNode
  tone?: 'accent' | 'violet' | 'pink' | 'gold' | 'green'
}) {
  return (
    <div className={`${styles.stat} ${styles[`tone_${tone}`]}`}>
      <span className={styles.statIcon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.statText}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  )
}
