import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/feedback/Toast'
import { ApiError } from './api/client'
import { catalogApi } from './api/endpoints'

/** Toggle a favourite from anywhere; refreshes every list that shows games and confirms with a toast. */
export function useFavoriteToggle() {
  const { t } = useTranslation()
  const toast = useToast()
  const client = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)

  async function toggle(slug: string, currentlyFavorite: boolean) {
    setBusy(slug)
    try {
      const res = await catalogApi.favorite(slug, !currentlyFavorite)
      toast.success(res.is_favorite ? t('toast.favoriteAdded') : t('toast.favoriteRemoved'))
      await Promise.all([
        client.invalidateQueries({ queryKey: ['games'] }),
        client.invalidateQueries({ queryKey: ['game', slug] }),
        client.invalidateQueries({ queryKey: ['me', 'home'] }),
      ])
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'))
    } finally {
      setBusy(null)
    }
  }

  return { toggle, busy }
}
