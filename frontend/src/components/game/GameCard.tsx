/** The single game card used by every rail and grid in the app. */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, Heart, Lock, Zap } from 'lucide-react'
import type { GameCard as GameCardData } from '@/lib/api/types'
import { formatNumber } from '@/lib/format'
import { Icon } from '@/components/ui/Icon'
import { ProgressBar } from '@/components/ui/Feedback'
import styles from './GameCard.module.css'

export function GameCard({ game, showProgress }: { game: GameCardData; showProgress?: boolean }) {
  const { t } = useTranslation()
  const accent = game.accent_color || game.category.color
  const upcoming = game.status === 'coming_soon'
  return (
    <Link
      to={`/game/${game.slug}`}
      className={styles.card}
      style={{ '--accent-color': accent } as React.CSSProperties}
    >
      <div className={styles.art}>
        {game.thumbnail ? (
          <img src={game.thumbnail} alt="" loading="lazy" />
        ) : (
          <Icon name={game.category.icon} size={44} className={styles.artIcon} />
        )}
        <div className={styles.badges}>
          {upcoming && <span className={styles.badge}>{t('common.comingSoon')}</span>}
          {game.is_locked && (
            <span className={styles.badge}>
              <Lock size={12} aria-hidden="true" /> {t('common.levelShort', { level: game.required_level })}
            </span>
          )}
        </div>
        {game.is_favorite && <Heart size={18} className={styles.fav} aria-label={t('game.unfavorite')} fill="currentColor" />}
      </div>
      <div className={styles.body}>
        <span className={styles.category}>{game.category.name}</span>
        <h3 className={styles.title}>{game.title}</h3>
        <p className={styles.desc}>{game.short_description}</p>
        <div className={styles.meta}>
          <span>{t(`difficulty.${game.difficulty}`)}</span>
          <span className={styles.metaItem}>
            <Clock size={14} aria-hidden="true" /> {t('common.minutes', { count: game.estimated_minutes })}
          </span>
          <span className={`${styles.metaItem} ${styles.xp}`}>
            <Zap size={14} aria-hidden="true" /> {t('common.xp', { value: formatNumber(game.base_xp) })}
          </span>
        </div>
        {showProgress && game.progress && (
          <div className={styles.progress}>
            <ProgressBar value={game.progress.progress_percent / 100} label={t('game.yourProgress')} size="sm" />
            <span>{game.progress.progress_percent}%</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export function GameGrid({ games, showProgress }: { games: GameCardData[]; showProgress?: boolean }) {
  return (
    <ul className={styles.grid}>
      {games.map((g) => (
        <li key={g.slug}>
          <GameCard game={g} showProgress={showProgress} />
        </li>
      ))}
    </ul>
  )
}

/** Horizontal, swipeable rail on small screens; grid on larger ones. */
export function GameRail({ games, showProgress }: { games: GameCardData[]; showProgress?: boolean }) {
  return (
    <ul className={styles.rail}>
      {games.map((g) => (
        <li key={g.slug}>
          <GameCard game={g} showProgress={showProgress} />
        </li>
      ))}
    </ul>
  )
}
