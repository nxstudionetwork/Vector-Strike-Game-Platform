/**
 * Search + filter + paginated grid. Filters live in the URL so they survive
 * reloads, can be shared, and work with browser back/forward.
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
import { catalogApi, type GameQuery } from '@/lib/api/endpoints'
import type { Difficulty } from '@/lib/api/types'
import styles from './GameZone.module.css'

const PAGE = 24
const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced', 'expert']
type Show = 'all' | 'live' | 'coming_soon' | 'favorites' | 'played'

export function GameBrowser({ category }: { category?: string }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const difficulty = params.get('difficulty') ?? ''
  const show = (params.get('show') as Show) || 'all'
  const sort = (params.get('sort') as GameQuery['sort']) || 'featured'
  const [search, setSearch] = useState(q)

  // Debounce typing into the URL.
  useEffect(() => {
    const id = window.setTimeout(() => update('q', search.trim()), 300)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function update(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value && !(key === 'show' && value === 'all') && !(key === 'sort' && value === 'featured')) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const query: GameQuery = {
    category,
    q: q || undefined,
    difficulty: difficulty || undefined,
    status: show === 'live' || show === 'coming_soon' ? show : undefined,
    favorites: show === 'favorites',
    played: show === 'played',
    sort,
    limit: PAGE,
  }

  const games = useInfiniteQuery({
    queryKey: ['games', 'browse', query],
    queryFn: ({ pageParam }) => catalogApi.games({ ...query, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.next ? pages.length * PAGE : undefined),
  })

  const filtered = Boolean(q || difficulty || show !== 'all')
  const items = games.data?.pages.flatMap((p) => p.results) ?? []
  const total = games.data?.pages[0]?.count ?? 0

  return (
    <div className={styles.browser}>
      <div className={styles.filters} role="search">
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
        <div className={styles.selects}>
          <SelectField label={t('gameZone.show')} value={show} onChange={(e) => update('show', e.target.value)}>
            <option value="all">{t('gameZone.showAll')}</option>
            <option value="live">{t('gameZone.showLive')}</option>
            <option value="coming_soon">{t('gameZone.showUpcoming')}</option>
            <option value="favorites">{t('gameZone.showFavorites')}</option>
            <option value="played">{t('gameZone.showPlayed')}</option>
          </SelectField>
          <SelectField label={t('gameZone.difficulty')} value={difficulty} onChange={(e) => update('difficulty', e.target.value)}>
            <option value="">{t('gameZone.anyDifficulty')}</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {t(`difficulty.${d}`)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('gameZone.sort')} value={sort} onChange={(e) => update('sort', e.target.value)}>
            <option value="featured">{t('gameZone.sortFeatured')}</option>
            <option value="new">{t('gameZone.sortNew')}</option>
            <option value="title">{t('gameZone.sortTitle')}</option>
          </SelectField>
        </div>
      </div>

      {games.isPending ? (
        <div className={styles.skeletonGrid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={260} radius={18} />
          ))}
        </div>
      ) : games.isError ? (
        <ErrorState error={games.error} onRetry={() => games.refetch()} />
      ) : items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<Search size={26} />}
            title={t('gameZone.emptyFilteredTitle')}
            body={t('gameZone.emptyFilteredBody')}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setParams({}, { replace: true })
                }}
              >
                {t('gameZone.clearFilters')}
              </Button>
            }
          />
        ) : (
          <EmptyState icon={<Gamepad2 size={26} />} title={t('gameZone.emptyTitle')} body={t('gameZone.emptyBody')} />
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
