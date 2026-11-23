/**
 * Game details / pre-game screen (reusable for every game): artwork, description,
 * skills, difficulty, time, XP reward, best score, attempts, progress, Start Game.
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Award, Clock, Gamepad2, Gauge, Heart, Lock, Play, RotateCcw, Zap } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { FormError } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { ApiError } from '@/lib/api/client'
import { playApi } from '@/lib/api/endpoints'
import type { GameSession } from '@/lib/api/types'
import { formatNumber } from '@/lib/format'
import { useGame } from '@/lib/queries'
import { useFavoriteToggle } from '@/lib/useFavorite'
import { getGameModule } from '@/games/registry'
import { GamePlayer } from './GamePlayer'
import styles from './GamePage.module.css'

export default function GamePage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const query = useGame(slug)
  const fav = useFavoriteToggle()
  const [session, setSession] = useState<{ session: GameSession; resume: Record<string, unknown> } | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string>()

  const back = (
    <ButtonLink to="/game-zone" variant="ghost" size="sm" icon={<ArrowLeft size={16} aria-hidden="true" />} className={styles.back}>
      {t('gameZone.backToZone')}
    </ButtonLink>
  )

  if (query.isPending) return <Skeleton height={360} radius={24} />
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
  const progress = game.progress
  const pct = progress?.progress_percent ?? 0
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

  const facts = [
    { icon: <Gauge size={18} />, label: t('game.difficultyLabel'), value: t(`difficulty.${game.difficulty}`) },
    { icon: <Clock size={18} />, label: t('game.timeLabel'), value: t('game.estimated', { count: game.estimated_minutes }) },
    { icon: <Zap size={18} />, label: t('game.xpReward'), value: `+${formatNumber(game.base_xp)} XP` },
    { icon: <Award size={18} />, label: t('game.bestScore'), value: progress ? formatNumber(progress.best_score) : t('profile.none') },
    { icon: <RotateCcw size={18} />, label: t('game.attempts'), value: formatNumber(progress?.attempts ?? 0) },
  ]

  return (
    <>
      {back}
      <article className={styles.layout} style={{ '--accent-color': accent } as React.CSSProperties}>
        <div className={styles.art}>
          {game.thumbnail ? <img src={game.thumbnail} alt="" /> : <Icon name={game.category.icon} size={84} className={styles.artIcon} />}
          {game.required_level > 1 && (
            <span className={styles.lockTag}>
              <Lock size={14} aria-hidden="true" /> {t('game.unlockAt', { level: game.required_level })}
            </span>
          )}
        </div>

        <div className={styles.info}>
          <Link to={`/game-zone/category/${game.category.slug}`} className={styles.category}>
            {game.category.name}
          </Link>
          <h1 className={styles.title}>{game.title}</h1>
          <p className={styles.desc}>{game.description || game.short_description}</p>

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

          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.label} className={styles.fact}>
                <span className={styles.factIcon} aria-hidden="true">
                  {f.icon}
                </span>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>

          {progress && (
            <div className={styles.progress}>
              <div className={styles.progressHead}>
                <span>{t('game.progressLabel')}</span>
                <strong>{t(`game.status.${progress.status}`)}</strong>
              </div>
              <ProgressBar value={pct / 100} label={t('game.progressLabel')} />
            </div>
          )}

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
              {resumable ? t('game.resume') : progress?.completions ? t('game.playAgain') : t('game.startGame')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => fav.toggle(game.slug, game.is_favorite)}
              disabled={fav.busy === game.slug}
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
        </div>
      </article>

      {session && module && (
        <GamePlayer
          key={session.session.id}
          game={game}
          module={module}
          session={session.session}
          resumeState={session.resume}
          onPlayAgain={start}
          onClose={() => setSession(null)}
        />
      )}
    </>
  )
}
