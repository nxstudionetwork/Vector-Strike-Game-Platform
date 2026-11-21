/** Server-state hooks. Query keys are centralised so invalidation stays consistent. */
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi, meApi, type GameQuery } from './api/endpoints'

export const qk = {
  categories: ['categories'] as const,
  category: (slug: string) => ['categories', slug] as const,
  games: (params: GameQuery) => ['games', params] as const,
  game: (slug: string) => ['game', slug] as const,
  home: ['me', 'home'] as const,
  progress: (days: number) => ['me', 'progress', days] as const,
  achievements: ['me', 'achievements'] as const,
  notifications: ['me', 'notifications'] as const,
}

export const useCategories = () => useQuery({ queryKey: qk.categories, queryFn: catalogApi.categories, staleTime: 5 * 60_000 })
export const useCategory = (slug: string) => useQuery({ queryKey: qk.category(slug), queryFn: () => catalogApi.category(slug) })
export const useGames = (params: GameQuery) =>
  useQuery({ queryKey: qk.games(params), queryFn: () => catalogApi.games(params), placeholderData: keepPreviousData })
export const useGame = (slug: string) => useQuery({ queryKey: qk.game(slug), queryFn: () => catalogApi.game(slug) })
export const useHomeFeed = () => useQuery({ queryKey: qk.home, queryFn: meApi.home })
export const useProgress = (days: number) =>
  useQuery({ queryKey: qk.progress(days), queryFn: () => meApi.progress(days), placeholderData: keepPreviousData })
export const useAchievements = () => useQuery({ queryKey: qk.achievements, queryFn: meApi.achievements })
export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: meApi.notifications, refetchInterval: 60_000 })

/** Call after anything that changes progression (a finished game, a challenge…). */
export function useInvalidateProgress() {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['me'] }),
      client.invalidateQueries({ queryKey: ['games'] }),
      client.invalidateQueries({ queryKey: ['game'] }),
    ])
}
