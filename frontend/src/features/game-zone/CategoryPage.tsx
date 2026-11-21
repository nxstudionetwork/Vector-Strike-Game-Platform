import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Compass } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { ApiError } from '@/lib/api/client'
import { useCategory } from '@/lib/queries'
import { GameBrowser } from './GameBrowser'
import styles from './GameZone.module.css'

export default function CategoryPage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const category = useCategory(slug)

  const back = (
    <ButtonLink to="/game-zone" variant="ghost" size="sm" icon={<ArrowLeft size={16} aria-hidden="true" />} className={styles.back}>
      {t('gameZone.backToZone')}
    </ButtonLink>
  )

  if (category.isPending) return <Skeleton height={180} radius={24} />
  if (category.isError) {
    return category.error instanceof ApiError && category.error.status === 404 ? (
      <EmptyState icon={<Compass size={26} />} title={t('gameZone.categoryNotFound')} action={back} />
    ) : (
      <ErrorState error={category.error} onRetry={() => category.refetch()} />
    )
  }

  const c = category.data
  return (
    <>
      {back}
      <header className={styles.categoryHero} style={{ '--c': c.color } as React.CSSProperties}>
        <span className={styles.categoryHeroIcon} aria-hidden="true">
          <Icon name={c.icon} size={40} />
        </span>
        <div>
          <h1 className={styles.categoryTitle}>{t(`categories.${c.slug}`, { defaultValue: c.name })}</h1>
          <p className={styles.categoryTagline}>{c.tagline}</p>
        </div>
      </header>
      <GameBrowser category={c.slug} />
    </>
  )
}
