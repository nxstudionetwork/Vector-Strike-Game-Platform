/** Level + XP progress, animated from empty on mount. Used by Home, header menu, Profile, Progress. */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { StatsSummary } from '@/lib/api/types'
import { formatNumber, formatPercent } from '@/lib/format'
import { ProgressBar } from './Feedback'
import styles from './XPBar.module.css'

export function XPBar({ stats, size = 'md', showLabels = true }: { stats: StatsSummary; size?: 'sm' | 'md' | 'lg'; showLabels?: boolean }) {
  const { t } = useTranslation()
  const [value, setValue] = useState(0)
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setValue(stats.progress))
    // Fallback for backgrounded tabs where animation frames are paused.
    const timer = window.setTimeout(() => setValue(stats.progress), 120)
    return () => {
      window.cancelAnimationFrame(id)
      window.clearTimeout(timer)
    }
  }, [stats.progress])

  return (
    <div className={styles.wrap}>
      {showLabels && (
        <div className={styles.row}>
          <span className={styles.level}>{t('common.level', { level: stats.level })}</span>
          <span className={styles.hint}>
            {t('home.percentToNext', { percent: formatPercent(stats.progress), level: stats.level + 1 })}
          </span>
        </div>
      )}
      <ProgressBar
        value={value}
        size={size}
        label={t('home.xpToNext', { value: formatNumber(stats.xp_to_next_level), level: stats.level + 1 })}
      />
      {showLabels && (
        <span className={styles.sub}>
          {t('progress.xpOf', {
            current: formatNumber(stats.xp_into_level),
            target: formatNumber(stats.next_level_xp - stats.level_floor_xp),
          })}
        </span>
      )}
    </div>
  )
}
