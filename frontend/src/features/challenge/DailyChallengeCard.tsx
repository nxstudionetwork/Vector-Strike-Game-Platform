/** Prominent "Today's challenge" card. Completion state comes from the server (one reward per challenge). */
import { useTranslation } from 'react-i18next'
import { CalendarCheck, CheckCircle2, Coins, Target, Trophy, Zap } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import type { DailyChallenge } from '@/lib/api/types'
import { formatNumber, formatPercent } from '@/lib/format'
import styles from './DailyChallengeCard.module.css'

export function requirementText(t: (k: string, o?: Record<string, unknown>) => string, c: DailyChallenge) {
  const parts: string[] = []
  if (c.requirements.min_score != null) parts.push(t('challenge.requirementScore', { value: formatNumber(c.requirements.min_score) }))
  if (c.requirements.min_accuracy != null) parts.push(t('challenge.requirementAccuracy', { value: formatPercent(c.requirements.min_accuracy) }))
  return parts.join(' · ')
}

export function DailyChallengeCard({ challenge }: { challenge: DailyChallenge | null }) {
  const { t } = useTranslation()
  if (!challenge) {
    return <EmptyState compact icon={<CalendarCheck size={26} />} title={t('challenge.noneTitle')} body={t('challenge.noneBody')} />
  }
  const g = challenge.game
  const req = requirementText(t, challenge)
  return (
    <article
      className={`${styles.card} ${challenge.completed ? styles.done : ''}`}
      style={{ '--c': g.accent_color || g.category.color } as React.CSSProperties}
    >
      <div className={styles.art} aria-hidden="true">
        <Icon name={g.category.icon} size={56} />
        <span className={styles.ring} />
      </div>
      <div className={styles.body}>
        <p className={styles.kicker}>
          <Target size={14} aria-hidden="true" /> {t('home.todayChallenge')}
        </p>
        <h3 className={styles.title}>{challenge.title}</h3>
        <p className={styles.desc}>{challenge.description || t('home.challengeAsk')}</p>
        <ul className={styles.meta}>
          <li>{g.category.name}</li>
          <li>{t(`difficulty.${g.difficulty}`)}</li>
          {req && <li>{req}</li>}
        </ul>
        <div className={styles.reward}>
          <span className={styles.rewardLabel}>{t('home.reward')}</span>
          <span className={styles.xp}>
            <Zap size={16} aria-hidden="true" /> +{formatNumber(challenge.xp_reward)} XP
          </span>
          {challenge.coin_reward > 0 && (
            <span className={styles.coins}>
              <Coins size={16} aria-hidden="true" /> +{formatNumber(challenge.coin_reward)}
            </span>
          )}
          <span className={styles.ach}>
            <Trophy size={14} aria-hidden="true" /> {t('home.achievementProgress')}
          </span>
        </div>
        {challenge.completed ? (
          <p className={styles.complete} role="status">
            <CheckCircle2 size={20} aria-hidden="true" /> {t('home.challengeComplete')}
          </p>
        ) : (
          <ButtonLink to={`/game/${g.slug}`} variant="glow" icon={<Target size={18} aria-hidden="true" />}>
            {t('home.startChallenge')}
          </ButtonLink>
        )}
      </div>
    </article>
  )
}
