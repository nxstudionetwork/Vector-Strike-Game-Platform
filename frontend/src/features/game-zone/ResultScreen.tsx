/** Post-game celebration: XP count-up, level-up, achievements, daily challenge. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { animate, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Coins, RotateCcw, Sparkles, Star, Target, Trophy, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { GameDetail, SessionResult } from '@/lib/api/types'
import { formatDuration, formatNumber, formatPercent } from '@/lib/format'
import { useMotionConfig } from '@/lib/useReducedMotion'
import { useGames } from '@/lib/queries'
import styles from './GamePlayer.module.css'

function CountUp({ to }: { to: number }) {
  const reduced = useMotionConfig()
  const [value, setValue] = useState(reduced ? to : 0)
  useEffect(() => {
    if (reduced) return setValue(to)
    const controls = animate(0, to, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setValue(Math.round(v)) })
    return () => controls.stop()
  }, [to, reduced])
  return <>{formatNumber(value)}</>
}

export function ResultScreen({
  game,
  result,
  rejection,
  onClose,
  onPlayAgain,
}: {
  game: GameDetail
  result: SessionResult | null
  rejection?: string
  onClose: () => void
  onPlayAgain: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // "Next game": the first deterministic recommendation that isn't this game.
  const recs = useGames({ filter: 'recommended', limit: 4 })
  const next = recs.data?.results.find((g) => g.slug !== game.slug && !g.is_locked)

  if (rejection || !result) {
    return (
      <div className={styles.result}>
        <span className={styles.rejectIcon} aria-hidden="true">
          <AlertTriangle size={36} />
        </span>
        <h2 className={styles.resultTitle}>{t('result.rejected')}</h2>
        <p className={styles.muted}>{t('result.rejectedBody', { reason: rejection })}</p>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </div>
    )
  }

  const s = result.session
  return (
    <div className={styles.result} role="status" aria-live="polite">
      <motion.div
        className={styles.burst}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        aria-hidden="true"
      >
        <Trophy size={44} />
      </motion.div>
      <h2 className={styles.resultTitle}>{t('result.title')}</h2>
      <p className={styles.muted}>{game.title}</p>

      <div className={styles.resultStats}>
        <div>
          <span>{t('result.score')}</span>
          <strong>{formatNumber(s.score)}</strong>
        </div>
        {s.accuracy !== null && (
          <div>
            <span>{t('result.accuracy')}</span>
            <strong>{formatPercent(s.accuracy)}</strong>
          </div>
        )}
        <div>
          <span>{t('result.time')}</span>
          <strong>{formatDuration(s.duration_seconds)}</strong>
        </div>
        <div>
          <span>{t('result.bestScore')}</span>
          <strong>{formatNumber(Math.max(s.score, game.progress?.best_score ?? 0))}</strong>
        </div>
      </div>

      <div className={styles.rewards}>
        <div className={styles.rewardXp}>
          <Zap size={22} aria-hidden="true" />
          <strong>
            +<CountUp to={result.xp_awarded} />
          </strong>
          <span>{t('result.xpEarned')}</span>
        </div>
        {result.coins_awarded > 0 && (
          <div className={styles.rewardCoins}>
            <Coins size={22} aria-hidden="true" />
            <strong>+{formatNumber(result.coins_awarded)}</strong>
            <span>{t('result.pointsEarned')}</span>
          </div>
        )}
      </div>

      <ul className={styles.highlights}>
        {result.is_personal_best && (
          <li>
            <Star size={16} aria-hidden="true" /> {t('result.personalBest')}
          </li>
        )}
        {result.is_first_completion && (
          <li>
            <Sparkles size={16} aria-hidden="true" /> {t('result.firstClear')}
          </li>
        )}
        {result.leveled_up && (
          <motion.li initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={styles.levelUp}>
            <Zap size={16} aria-hidden="true" /> {t('result.levelUp', { level: result.level })}
          </motion.li>
        )}
        {result.daily_challenge_completed && (
          <li>
            <Target size={16} aria-hidden="true" /> {t('result.dailyDone', { xp: result.daily_challenge_xp })}
          </li>
        )}
      </ul>

      {result.achievements_unlocked.length > 0 && (
        <div className={styles.unlocks}>
          <h3>{t('result.achievementsTitle')}</h3>
          <ul>
            {result.achievements_unlocked.map((a, i) => (
              <motion.li
                key={a.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
                style={{ '--rarity': `var(--rarity-${a.rarity})` } as Record<string, string>}
              >
                <span aria-hidden="true">
                  <Icon name={a.icon} size={20} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.description}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.resultActions}>
        <Button variant="glow" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={onPlayAgain}>
          {t('result.playAgain')}
        </Button>
        {next && (
          <Button
            variant="secondary"
            iconEnd={<ArrowRight size={18} aria-hidden="true" />}
            onClick={() => {
              onClose()
              navigate(`/game/${next.slug}`)
            }}
          >
            {t('result.nextGame')}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            onClose()
            navigate('/game-zone')
          }}
        >
          {t('result.backToZone')}
        </Button>
      </div>
    </div>
  )
}
