import { useTranslation } from 'react-i18next'
import { Gamepad2 } from 'lucide-react'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Section } from '@/components/ui/Surfaces'
import { CategoryGrid } from '@/components/game/CategoryCard'
import { useCategories } from '@/lib/queries'
import { GameBrowser } from './GameBrowser'
import styles from './GameZone.module.css'

export default function GameZonePage() {
  const { t } = useTranslation()
  const categories = useCategories()

  return (
    <>
      <header className={styles.zoneHero}>
        <span className={styles.zoneIcon} aria-hidden="true">
          <Gamepad2 size={34} />
        </span>
        <div>
          <h1 className={styles.zoneTitle}>{t('gameZone.title')}</h1>
          <p className={styles.zoneTagline}>{t('gameZone.tagline')}</p>
          <p className={styles.zoneSub}>{t('gameZone.subtitle')}</p>
        </div>
      </header>

      <Section id="worlds" title={t('gameZone.categoriesTitle')}>
        {categories.isPending ? (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} height={150} radius={18} />
            ))}
          </div>
        ) : categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => categories.refetch()} compact />
        ) : (
          <CategoryGrid categories={categories.data} />
        )}
      </Section>

      <Section id="games" title={t('gameZone.gamesTitle')}>
        <GameBrowser />
      </Section>
    </>
  )
}
