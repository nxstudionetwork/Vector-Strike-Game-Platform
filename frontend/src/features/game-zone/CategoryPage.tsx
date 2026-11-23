import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, Compass, Gamepad2, PlayCircle } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { Section, StatCard } from '@/components/ui/Surfaces'
import { GameRail } from '@/components/game/GameCard'
import { ApiError } from '@/lib/api/client'
import { formatNumber, formatPercent } from '@/lib/format'
import { useCategory, useGames } from '@/lib/queries'
import { GameBrowser } from './GameBrowser'
import styles from './GameZone.module.css'

export default function CategoryPage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const category = useCategory(slug)
  const recommended = useGames({ category: slug, filter: 'recommended', limit: 6 })

  const back = (
    <ButtonLink to="/game-zone" variant="ghost" size="sm" icon={<ArrowLeft size={16} aria-hidden="true" />} className={styles.back}>
      {t('gameZone.backToZone')}
    </ButtonLink>
  )

  if (category.isPending) return <Skeleton height={220} radius={24} />
  if (category.isError) {
    return category.error instanceof ApiError && category.error.status === 404 ? (
      <EmptyState icon={<Compass size={26} />} title={t('gameZone.categoryNotFound')} action={back} />
    ) : (
      <ErrorState error={category.error} onRetry={() => category.refetch()} />
    )
  }

  const c = category.data
  const name = t(`categories.${c.slug}`, { defaultValue: c.name })
  const p = c.progress
  const recGames = recommended.data?.results ?? []

  return (
    <>
      {back}
      <header className={styles.categoryHero} style={{ '--c': c.color } as React.CSSProperties}>
        <span className={styles.categoryHeroIcon} aria-hidden="true">
          <Icon name={c.icon} size={44} />
        </span>
        <div className={styles.categoryHeroText}>
          <h1 className={styles.categoryTitle}>{name}</h1>
          <p className={styles.categoryTagline}>{c.description || c.tagline}</p>
          <div className={styles.categoryProgress}>
            <div className={styles.categoryProgressHead}>
              <span>{t('gameZone.categoryProgress', { name })}</span>
              <strong>{formatPercent(p.percent)}</strong>
            </div>
            <ProgressBar value={p.percent} size="lg" tone="accent" label={t('gameZone.categoryProgress', { name })} />
          </div>
        </div>
      </header>

      <div className={styles.catStats}>
        <StatCard icon={<Gamepad2 size={20} />} label={t('gameZone.totalGames')} value={formatNumber(p.live_games)} />
        <StatCard icon={<PlayCircle size={20} />} label={t('gameZone.playedGames')} value={formatNumber(p.played_games)} tone="violet" />
        <StatCard icon={<CheckCircle2 size={20} />} label={t('gameZone.completedGames')} value={formatNumber(p.completed_games)} tone="green" />
      </div>
      {c.upcoming_games > 0 && <p className={styles.count}>{t('gameZone.comingSoonCount', { count: c.upcoming_games })}</p>}

      {recGames.length > 0 && (
        <Section id="cat-recommended" title={t('gameZone.recommendedInWorld')}>
          <GameRail games={recGames} />
        </Section>
      )}

      <Section id="cat-all" title={t('gameZone.allGames')}>
        <GameBrowser category={c.slug} />
      </Section>
    </>
  )
}
