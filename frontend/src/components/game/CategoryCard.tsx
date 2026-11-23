/** The single world/category card used by Home, Game Zone and search. */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Category, CategoryRef } from '@/lib/api/types'
import { Icon } from '@/components/ui/Icon'
import styles from './CategoryCard.module.css'

type CategoryLike = CategoryRef & Partial<Pick<Category, 'tagline' | 'live_games' | 'upcoming_games'>>

export function CategoryCard({ category: c, compact }: { category: CategoryLike; compact?: boolean }) {
  const { t } = useTranslation()
  const live = c.live_games ?? 0
  const upcoming = c.upcoming_games ?? 0
  return (
    <Link
      to={`/game-zone/category/${c.slug}`}
      className={`${styles.card} ${compact ? styles.compact : ''}`}
      style={{ '--c': c.color } as React.CSSProperties}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon name={c.icon} size={compact ? 20 : 26} />
      </span>
      <span className={styles.name}>{t(`categories.${c.slug}`, { defaultValue: c.name })}</span>
      {!compact && c.tagline && <span className={styles.tagline}>{c.tagline}</span>}
      {!compact && (
        <span className={styles.count}>
          {live > 0
            ? t('gameZone.gamesCount', { count: live })
            : upcoming > 0
              ? t('gameZone.upcomingCount', { count: upcoming })
              : t('gameZone.noGamesYet')}
        </span>
      )}
    </Link>
  )
}

export function CategoryGrid({ categories, compact }: { categories: CategoryLike[]; compact?: boolean }) {
  return (
    <ul className={compact ? styles.gridCompact : styles.grid}>
      {categories.map((c) => (
        <li key={c.slug}>
          <CategoryCard category={c} compact={compact} />
        </li>
      ))}
    </ul>
  )
}
