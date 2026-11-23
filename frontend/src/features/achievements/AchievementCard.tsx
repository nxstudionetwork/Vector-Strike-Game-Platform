import { useTranslation } from 'react-i18next'
import { CheckCircle2, Lock } from 'lucide-react'
import type { Achievement } from '@/lib/api/types'
import { formatDate } from '@/lib/format'
import { ProgressBar } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import styles from './AchievementCard.module.css'

export function AchievementCard({ achievement: a, compact }: { achievement: Achievement; compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <article
      className={`${styles.badge} ${a.is_unlocked ? styles.unlocked : styles.locked} ${compact ? styles.compact : ''}`}
      style={{ '--rarity': `var(--rarity-${a.rarity})` } as React.CSSProperties}
    >
      <span className={styles.medal} aria-hidden="true">
        <Icon name={a.icon} size={compact ? 22 : 26} />
      </span>
      <div className={styles.text}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{a.title}</h3>
          <span className={styles.rarity}>{t(`achievements.rarity.${a.rarity}`)}</span>
        </div>
        <p className={styles.desc}>{a.description}</p>
        {a.is_unlocked ? (
          <p className={styles.status}>
            <CheckCircle2 size={14} aria-hidden="true" />
            {a.unlocked_at ? t('achievements.unlockedOn', { date: formatDate(a.unlocked_at) }) : t('achievements.unlockedLabel')}
          </p>
        ) : (
          !compact && (
            <div className={styles.progress}>
              <span className="visually-hidden">{t('achievements.lockedLabel')}</span>
              <Lock size={12} aria-hidden="true" />
              <ProgressBar
                value={a.threshold ? a.progress / a.threshold : 0}
                size="sm"
                tone="accent"
                label={t('achievements.progress', { value: a.progress, target: a.threshold })}
              />
              <span>{t('achievements.progress', { value: a.progress, target: a.threshold })}</span>
            </div>
          )
        )}
        {!compact && a.xp_reward > 0 && <span className={styles.reward}>{t('achievements.reward', { xp: a.xp_reward })}</span>}
      </div>
    </article>
  )
}
