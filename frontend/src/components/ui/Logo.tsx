import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './Logo.module.css'

export function LogoMark({ size = 36, animated = false }: { size?: number; animated?: boolean }) {
  const id = useId()
  return (
    <svg
      className={`${styles.mark} ${animated ? styles.animated : ''}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.6" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path className={styles.v} d="M8 12h12l12 30 12-30h12L38 54H26z" fill={`url(#${id}g)`} />
      <path className={styles.strike} d="M42 8h14l-6 14H36z" fill="#f472b6" />
    </svg>
  )
}

export function Logo({ size = 32, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  const { t } = useTranslation()
  return (
    <span className={styles.logo}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span className={styles.wordmark} style={{ fontSize: size * 0.56 }}>
          VECTOR<span className="gradient-text"> STRIKE</span>
        </span>
      ) : (
        <span className="visually-hidden">{t('brand.name')}</span>
      )}
    </span>
  )
}
