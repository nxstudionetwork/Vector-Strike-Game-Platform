/**
 * The single game card used everywhere (rails, grids, favourites, search).
 * States: NEW · x% COMPLETE · COMPLETED · LOCKED · COMING SOON (+ favourite).
 * The whole card is one link (stretched); the favourite button sits above it.
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, Heart, Lock, Sparkles, Zap } from 'lucide-react'
import type { GameCard as GameCardData } from '@/lib/api/types'
import { formatNumber } from '@/lib/format'
import { useFavoriteToggle } from '@/lib/useFavorite'
import { Icon } from '@/components/ui/Icon'
import { ProgressBar } from '@/components/ui/Feedback'
import styles from './GameCard.module.css'

const NEW_DAYS = 30

export type GameCardState = 'locked' | 'coming_soon' | 'completed' | 'in_progress' | 'new' | null

export function gameCardState(game: GameCardData): GameCardState {
  if (game.status === 'coming_soon') return 'coming_soon'
  if (game.is_locked) return 'locked'
  const p = game.progress
  if (p && (p.status === 'completed' || p.status === 'mastered') && !(p.progress_percent > 0 && p.progress_percent < 100)) return 'completed'
  if (p && p.progress_percent > 0 && p.progress_percent < 100) return 'in_progress'
  if (!p && game.published_at && Date.now() - new Date(game.published_at).getTime() < NEW_DAYS * 86_400_000) return 'new'
  return null
}

export function GameCard({ game, showProgress = true }: { game: GameCardData; showProgress?: boolean }) {
  const { t } = useTranslation()
  const { toggle, busy } = useFavoriteToggle()
  const accent = game.accent_color || game.category.color
  const state = gameCardState(game)
  const percent = game.progress?.progress_percent ?? 0

  const badge = {
    coming_soon: { icon: <Clock size={12} />, label: t('common.comingSoon'), tone: styles.badgeMuted },
    locked: { icon: <Lock size={12} />, label: `${t('game.stateLocked')} · ${t('common.levelShort', { level: game.required_level })}`, tone: styles.badgeMuted },
    completed: { icon: <CheckCircle2 size={12} />, label: t('game.stateComplete'), tone: styles.badgeSuccess },
    in_progress: { icon: null, label: t('game.statePercent', { percent }), tone: styles.badgeAccent },
    new: { icon: <Sparkles size={12} />, label: t('game.stateNew'), tone: styles.badgeNew },
  }[state ?? 'new']

  return (
    <article className={`${styles.card} ${state === 'locked' ? styles.isLocked : ''}`} style={{ '--accent-color': accent } as React.CSSProperties}>
      <div className={styles.art}>
        {game.thumbnail ? (
          <img src={game.thumbnail} alt="" loading="lazy" decoding="async" />
        ) : (
          <Icon name={game.category.icon} size={44} className={styles.artIcon} />
        )}
        {state && (
          <span className={`${styles.badge} ${badge.tone}`}>
            {badge.icon && <span aria-hidden="true">{badge.icon}</span>}
            {badge.label}
          </span>
        )}
      </div>
      <button
        type="button"
        className={`${styles.fav} ${game.is_favorite ? styles.favOn : ''}`}
        aria-pressed={game.is_favorite}
        aria-label={`${game.is_favorite ? t('game.unfavorite') : t('game.favorite')}: ${game.title}`}
        disabled={busy === game.slug}
        onClick={() => toggle(game.slug, game.is_favorite)}
      >
        <Heart size={18} aria-hidden="true" fill={game.is_favorite ? 'currentColor' : 'none'} />
      </button>
      <div className={styles.body}>
        <span className={styles.category}>{game.category.name}</span>
        <h3 className={styles.title}>
          <Link to={`/game/${game.slug}`} className={styles.stretched}>
            {game.title}
          </Link>
        </h3>
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
        {showProgress && state === 'in_progress' && (
          <div className={styles.progress}>
            <ProgressBar value={percent / 100} label={t('game.yourProgress')} size="sm" />
            <span>{percent}%</span>
          </div>
        )}
      </div>
    </article>
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

/** Horizontal, swipeable rail on phones; grid on larger screens. */
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
