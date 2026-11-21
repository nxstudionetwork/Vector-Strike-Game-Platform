import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock, Gamepad2, Heart, Lock, Play, Zap } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { FormError } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Card } from '@/components/ui/Surfaces'
import { ApiError } from '@/lib/api/client'
import { catalogApi, playApi } from '@/lib/api/endpoints'
import type { GameSession } from '@/lib/api/types'
import { formatNumber } from '@/lib/format'
import { qk, useGame } from '@/lib/queries'
import { getGameModule } from '@/games/registry'
import { GamePlayer } from './GamePlayer'
import styles from './GamePage.module.css'

export default function GamePage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const client = useQueryClient()
  const query = useGame(slug)
  const [session, setSession] = useState<{ session: GameSession; resume: Record<string, unknown> } | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string>()
  const [favBusy, setFavBusy] = useState(false)

  const back = (
    <ButtonLink to="/game-zone" variant="ghost" size="sm" icon={<ArrowLeft size={16} aria-hidden="true" />} className={styles.back}>
      {t('gameZone.backToZone')}
    </ButtonLink>
  )

  if (query.isPending) return <Skeleton height={320} radius={24} />
  if (query.isError) {
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState icon={<Gamepad2 size={26} />} title={t('game.notFound')} action={back} />
    ) : (
      <ErrorState error={query.error} onRetry={() => query.refetch()} />
    )
  }

  const game = query.data
  const module = getGameModule(game.module_key)
  const accent = game.accent_color || game.category.color
  const blocked =
    game.status !== 'live'
      ? t('game.comingSoonBody')
      : game.is_locked
        ? t('game.lockedBody', { level: game.required_level })
        : !module
          ? t('game.moduleMissing')
          : null
  const pct = game.progress?.progress_percent ?? 0
  const resumable = pct > 0 && pct < 100

  async function start() {
    setStarting(true)
    setStartError(undefined)
    try {
      const res = await playApi.start(game.slug)
      setSession({ session: res.session, resume: res.resume_state })
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : t('errors.generic'))
    } finally {
      setStarting(false)
    }
  }

  async function toggleFavorite() {
    setFavBusy(true)
    try {
      const res = await catalogApi.favorite(game.slug, !game.is_favorite)
      client.setQueryData(qk.game(game.slug), { ...game, is_favorite: res.is_favorite })
      void client.invalidateQueries({ queryKey: ['games'] })
    } finally {
      setFavBusy(false)
    }
  }

  return (
    <>
      {back}
      <article className={styles.layout} style={{ '--accent-color': accent } as React.CSSProperties}>
        <div className={styles.art}>
          {game.thumbnail ? <img src={game.thumbnail} alt="" /> : <Icon name={game.category.icon} size={84} className={styles.artIcon} />}
        </div>
        <div className={styles.info}>
          <span className={styles.category}>{game.category.name}</span>
          <h1 className={styles.title}>{game.title}</h1>
          <p className={styles.desc}>{game.description || game.short_description}</p>
          <ul className={styles.meta}>
            <li>{t(`difficulty.${game.difficulty}`)}</li>
            <li>
              <Clock size={16} aria-hidden="true" /> {t('game.estimated', { count: game.estimated_minutes })}
            </li>
            <li className={styles.xp}>
              <Zap size={16} aria-hidden="true" /> {t('game.reward', { xp: formatNumber(game.base_xp) })}
            </li>
            {game.required_level > 1 && (
              <li>
                <Lock size={16} aria-hidden="true" /> {t('game.unlockAt', { level: game.required_level })}
              </li>
            )}
          </ul>

          <div className={styles.actions}>
            <Button
              variant="glow"
              size="lg"
              icon={<Play size={20} aria-hidden="true" />}
              onClick={start}
              loading={starting}
              loadingLabel={t('game.starting')}
              disabled={Boolean(blocked)}
              aria-describedby={blocked ? 'play-blocked' : undefined}
            >
              {resumable ? t('game.resume') : game.progress?.completions ? t('game.playAgain') : t('game.play')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={toggleFavorite}
              disabled={favBusy}
              aria-pressed={game.is_favorite}
              icon={<Heart size={20} aria-hidden="true" fill={game.is_favorite ? 'currentColor' : 'none'} />}
            >
              {game.is_favorite ? t('game.unfavorite') : t('game.favorite')}
            </Button>
          </div>
          {blocked && (
            <p id="play-blocked" className={styles.blocked}>
              {blocked}
            </p>
          )}
          <FormError message={startError} />

          {game.skills.length > 0 && (
            <div>
              <h2 className={styles.h2}>{t('game.skills')}</h2>
              <ul className={styles.skills}>
                {game.skills.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </article>

      <Card>
        <h2 className={styles.h2}>{t('game.yourProgress')}</h2>
        {game.progress ? (
          <div className={styles.progressGrid}>
            <div>
              <span className={styles.statLabel}>{t('game.bestScore')}</span>
              <strong>{formatNumber(game.progress.best_score)}</strong>
            </div>
            <div>
              <span className={styles.statLabel}>{t('game.attempts')}</span>
              <strong>{formatNumber(game.progress.attempts)}</strong>
            </div>
            <div>
              <span className={styles.statLabel}>{t('game.completions')}</span>
              <strong>{formatNumber(game.progress.completions)}</strong>
            </div>
            <div className={styles.progressBar}>
              <span className={styles.statLabel}>{t(`game.status.${game.progress.status}`)}</span>
              <ProgressBar value={game.progress.progress_percent / 100} label={t('game.yourProgress')} />
            </div>
          </div>
        ) : (
          <p className={styles.muted}>{t('game.notPlayed')}</p>
        )}
      </Card>

      {session && module && (
        <GamePlayer
          game={game}
          module={module}
          session={session.session}
          resumeState={session.resume}
          onClose={() => setSession(null)}
        />
      )}
    </>
  )
}
