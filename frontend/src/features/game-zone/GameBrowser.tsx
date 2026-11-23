/**
 * Search + filter tabs + difficulty/sort + paginated grid. All state lives in
 * the URL, so it survives reloads, can be shared, and works with back/forward.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Gamepad2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { SelectField } from '@/components/ui/Field'
import { GameGrid } from '@/components/game/GameCard'
import { catalogApi, type GameFilter, type GameQuery } from '@/lib/api/endpoints'
import type { Difficulty } from '@/lib/api/types'
import styles from './GameZone.module.css'

const PAGE = 24
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert']
const FILTERS: ('all' | GameFilter)[] = ['all', 'recommended', 'new', 'popular', 'in_progress', 'completed', 'favorites']

export function GameBrowser({ category, hideSearch }: { category?: string; hideSearch?: boolean }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const difficulty = params.get('difficulty') ?? ''
  const filterParam = params.get('filter') as GameFilter | null
  const filter: 'all' | GameFilter = filterParam && FILTERS.includes(filterParam) ? filterParam : 'all'
  const sort = (params.get('sort') as GameQuery['sort']) || 'featured'
  const [search, setSearch] = useState(q)

  useEffect(() => {
    const id = window.setTimeout(() => update('q', search.trim()), 300)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function update(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        const isDefault = !value || (key === 'filter' && value === 'all') || (key === 'sort' && value === 'featured')
        if (isDefault) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const query: GameQuery = {
    category,
    q: q || undefined,
    difficulty: difficulty || undefined,
    filter: filter === 'all' ? undefined : filter,
    sort,
    limit: PAGE,
  }

  const games = useInfiniteQuery({
    queryKey: ['games', 'browse', query],
    queryFn: ({ pageParam }) => catalogApi.games({ ...query, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * PAGE : undefined),
  })

  const narrowed = Boolean(q || difficulty)
  const items = games.data?.pages.flatMap((p) => p.results) ?? []
  const total = games.data?.pages[0]?.count ?? 0
  const sortDisabled = filter === 'new' || filter === 'popular' || filter === 'recommended'

  return (
    <div className={styles.browser}>
      <div className={styles.tabs} role="group" aria-label={t('gameZone.filterLabel')}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`}
            aria-pressed={filter === f}
            onClick={() => update('filter', f)}
          >
            {t(`gameZone.filterTabs.${f}`)}
          </button>
        ))}
      </div>

      <div className={styles.filters} role="search">
        {!hideSearch && (
          <label className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <span className="visually-hidden">{t('gameZone.searchLabel')}</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('gameZone.searchPlaceholder')}
              maxLength={64}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label={t('gameZone.clearFilters')}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>
        )}
        <div className={styles.selects}>
          <SelectField label={t('gameZone.difficulty')} value={difficulty} onChange={(e) => update('difficulty', e.target.value)}>
            <option value="">{t('gameZone.anyDifficulty')}</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {t(`difficulty.${d}`)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('gameZone.sort')} value={sort} disabled={sortDisabled} onChange={(e) => update('sort', e.target.value)}>
            <option value="featured">{t('gameZone.sortFeatured')}</option>
            <option value="new">{t('gameZone.sortNew')}</option>
            <option value="title">{t('gameZone.sortTitle')}</option>
          </SelectField>
        </div>
      </div>

      {games.isPending ? (
        <div className={styles.skeletonGrid} aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={280} radius={18} />
          ))}
        </div>
      ) : games.isError ? (
        <ErrorState error={games.error} onRetry={() => games.refetch()} />
      ) : items.length === 0 ? (
        narrowed ? (
          <EmptyState
            icon={<Search size={26} />}
            title={t('gameZone.emptyFilteredTitle')}
            body={t('gameZone.emptyFilteredBody')}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setParams(filter === 'all' ? {} : { filter }, { replace: true })
                }}
              >
                {t('gameZone.clearFilters')}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Gamepad2 size={26} />}
            title={t('gameZone.emptyTitle')}
            body={filter === 'all' ? t('gameZone.emptyBody') : t(`gameZone.emptyFilter.${filter}`)}
          />
        )
      ) : (
        <>
          <p className={styles.count} aria-live="polite">
            {t('gameZone.results', { count: total })}
          </p>
          <GameGrid games={items} />
          {games.hasNextPage && (
            <Button variant="secondary" onClick={() => games.fetchNextPage()} loading={games.isFetchingNextPage} className={styles.more}>
              {t('gameZone.loadMore')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
