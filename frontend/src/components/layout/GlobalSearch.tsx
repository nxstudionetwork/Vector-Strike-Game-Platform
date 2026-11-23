/**
 * Global search (combobox pattern). Results are grouped into Games, Worlds and
 * Challenges and come from GET /api/search/. Arrow keys move through results,
 * Enter opens one, Escape closes. Press "/" anywhere to focus search.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Search, X, Zap } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { Spinner } from '@/components/ui/Spinner'
import { useDismiss } from '@/lib/useDismiss'
import { formatDay } from '@/lib/format'
import { useSearch } from '@/lib/queries'
import styles from './GlobalSearch.module.css'

interface ResultItem {
  key: string
  group: 'games' | 'categories' | 'challenges'
  to: string
  title: string
  meta: string
  icon: React.ReactNode
  color?: string
}

function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return debounced
}

export function GlobalSearch({ autoFocus, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const id = useId()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const q = useDebounced(value.trim(), 250)
  const search = useSearch(q)

  useDismiss(open, () => setOpen(false), wrapRef)

  // "/" focuses search (unless typing in a field already).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key !== '/' || e.metaKey || e.ctrlKey || el.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const items = useMemo<ResultItem[]>(() => {
    const data = search.data
    if (!data || q.length < 2) return []
    return [
      ...data.games.map((g) => ({
        key: `g-${g.slug}`,
        group: 'games' as const,
        to: `/game/${g.slug}`,
        title: g.title,
        meta: `${g.category.name} · ${t(`difficulty.${g.difficulty}`)}`,
        icon: <Icon name={g.category.icon} size={18} />,
        color: g.accent_color || g.category.color,
      })),
      ...data.categories.map((c) => ({
        key: `c-${c.slug}`,
        group: 'categories' as const,
        to: `/game-zone/category/${c.slug}`,
        title: t(`categories.${c.slug}`, { defaultValue: c.name }),
        meta: c.tagline,
        icon: <Icon name={c.icon} size={18} />,
        color: c.color,
      })),
      ...data.challenges.map((c) => ({
        key: `ch-${c.id}`,
        group: 'challenges' as const,
        to: c.is_today ? '/challenge' : `/game/${c.game_slug}`,
        title: c.title,
        meta: c.is_today ? t('search.today') : formatDay(c.date, { dateStyle: 'medium' }),
        icon: c.completed ? <CheckCircle2 size={18} /> : <Zap size={18} />,
      })),
    ]
  }, [search.data, q, t])

  useEffect(() => setActive(0), [q])

  function go(item: ResultItem) {
    setOpen(false)
    setValue('')
    navigate(item.to)
    onNavigate?.()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault()
      go(items[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showPanel = open && value.trim().length > 0
  const groups: ResultItem['group'][] = ['games', 'categories', 'challenges']
  const listId = `${id}-list`

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.field}>
        <Search size={18} aria-hidden="true" className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={t('search.label')}
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && items[active] ? `${id}-${items[active].key}` : undefined}
          placeholder={t('search.placeholder')}
          value={value}
          maxLength={64}
          autoFocus={autoFocus}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {value ? (
          <button
            type="button"
            className={styles.clear}
            aria-label={t('search.clear')}
            onClick={() => {
              setValue('')
              inputRef.current?.focus()
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : (
          <kbd className={styles.kbd} aria-hidden="true" title={t('search.shortcut')}>
            /
          </kbd>
        )}
      </div>

      {showPanel && (
        <div className={styles.panel} id={listId} role="listbox" aria-label={t('search.label')}>
          {value.trim().length < 2 ? (
            <p className={styles.hint}>{t('search.minChars')}</p>
          ) : search.isError ? (
            <p className={styles.hint}>{t('errors.genericBody')}</p>
          ) : search.isPending || (search.isFetching && !items.length) ? (
            <p className={styles.hint}>
              <Spinner size={14} /> {t('search.searching')}
            </p>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <strong>{t('search.noResults')}</strong>
              <span>{t('search.noResultsBody')}</span>
            </div>
          ) : (
            groups.map((group) => {
              const groupItems = items.filter((i) => i.group === group)
              if (!groupItems.length) return null
              return (
                <div key={group} role="group" aria-label={t(`search.${group}`)}>
                  <p className={styles.groupLabel}>{t(`search.${group}`)}</p>
                  {groupItems.map((item) => {
                    const index = items.indexOf(item)
                    return (
                      <div
                        key={item.key}
                        id={`${id}-${item.key}`}
                        role="option"
                        aria-selected={index === active}
                        className={`${styles.option} ${index === active ? styles.optionActive : ''}`}
                        onMouseEnter={() => setActive(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(item)}
                      >
                        <span className={styles.optionIcon} style={{ '--c': item.color ?? 'var(--accent)' } as React.CSSProperties}>
                          {item.icon}
                        </span>
                        <span className={styles.optionText}>
                          <strong>{item.title}</strong>
                          {item.meta && <span>{item.meta}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
