import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Heart, HeartOff, Play } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { PageHeader } from '@/components/ui/Surfaces'
import { useGames } from '@/lib/queries'
import { useFavoriteToggle } from '@/lib/useFavorite'
import styles from './FavoritesPage.module.css'

export default function FavoritesPage() {
  const { t } = useTranslation()
  const query = useGames({ filter: 'favorites', limit: 48 })
  const { toggle, busy } = useFavoriteToggle()

  return (
    <>
      <PageHeader title={t('favorites.title')} subtitle={t('favorites.subtitle')} />
      {query.isPending ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={96} radius={18} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <EmptyState
          icon={<Heart size={26} />}
          title={t('favorites.emptyTitle')}
          body={t('favorites.emptyBody')}
          action={
            <ButtonLink to="/game-zone" iconEnd={<ArrowRight size={18} aria-hidden="true" />}>
              {t('home.exploreGameZone')}
            </ButtonLink>
          }
        />
      ) : (
        <ul className={styles.list}>
          {query.data.results.map((g) => {
            const pct = g.progress?.progress_percent ?? 0
            const playable = g.status === 'live' && !g.is_locked
            return (
              <li key={g.slug} className={styles.row} style={{ '--c': g.accent_color || g.category.color } as React.CSSProperties}>
                <span className={styles.art} aria-hidden="true">
                  <Icon name={g.category.icon} size={28} />
                </span>
                <div className={styles.info}>
                  <Link to={`/game/${g.slug}`} className={styles.title}>
                    {g.title}
                  </Link>
                  <span className={styles.meta}>
                    {g.category.name} · {t(`difficulty.${g.difficulty}`)}
                    {g.status === 'coming_soon' && ` · ${t('common.comingSoon')}`}
                    {g.is_locked && ` · ${t('game.unlockAt', { level: g.required_level })}`}
                  </span>
                  {g.progress && (
                    <div className={styles.progress}>
                      <ProgressBar value={pct / 100} size="sm" label={t('game.yourProgress')} />
                      <span>{pct}%</span>
                    </div>
                  )}
                </div>
                <div className={styles.actions}>
                  {playable && (
                    <ButtonLink to={`/game/${g.slug}`} size="sm" icon={<Play size={16} aria-hidden="true" />}>
                      {t('game.play')}
                    </ButtonLink>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<HeartOff size={16} aria-hidden="true" />}
                    disabled={busy === g.slug}
                    onClick={() => toggle(g.slug, true)}
                    aria-label={`${t('favorites.remove')}: ${g.title}`}
                  >
                    {t('favorites.remove')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
