import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { PageHeader, Section } from '@/components/ui/Surfaces'
import { useCategories } from '@/lib/queries'
import { GameBrowser } from './GameBrowser'
import styles from './GameZone.module.css'

export default function GameZonePage() {
  const { t } = useTranslation()
  const categories = useCategories()

  return (
    <>
      <PageHeader title={t('gameZone.title')} subtitle={t('gameZone.subtitle')} />

      <Section id="worlds" title={t('gameZone.categoriesTitle')}>
        {categories.isPending ? (
          <div className={styles.worlds}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={132} radius={18} />
            ))}
          </div>
        ) : categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => categories.refetch()} compact />
        ) : (
          <ul className={styles.worlds}>
            {categories.data.map((c) => (
              <li key={c.slug}>
                <Link to={`/game-zone/category/${c.slug}`} className={styles.world} style={{ '--c': c.color } as React.CSSProperties}>
                  <span className={styles.worldIcon} aria-hidden="true">
                    <Icon name={c.icon} size={26} />
                  </span>
                  <span className={styles.worldName}>{t(`categories.${c.slug}`, { defaultValue: c.name })}</span>
                  <span className={styles.worldTag}>{c.tagline}</span>
                  <span className={styles.worldCount}>
                    {c.live_games > 0
                      ? t('gameZone.gamesCount', { count: c.live_games })
                      : c.upcoming_games > 0
                        ? t('gameZone.upcomingCount', { count: c.upcoming_games })
                        : t('gameZone.noGamesYet')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="games" title={t('gameZone.gamesTitle')}>
        <GameBrowser />
      </Section>
    </>
  )
}
