import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'
import { Segmented } from '@/components/ui/Controls'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { Card, PageHeader, Section } from '@/components/ui/Surfaces'
import { useAchievements } from '@/lib/queries'
import { AchievementCard } from './AchievementCard'
import styles from './AchievementsPage.module.css'

type Filter = 'all' | 'unlocked' | 'in_progress' | 'locked'
const GROUP_ORDER = ['milestone', 'exploration', 'mastery', 'growth', 'consistency', 'challenge']

export default function AchievementsPage() {
  const { t } = useTranslation()
  const query = useAchievements()
  const [filter, setFilter] = useState<Filter>('all')

  const groups = useMemo(() => {
    const items = (query.data?.achievements ?? []).filter((a) =>
      filter === 'all'
        ? true
        : filter === 'unlocked'
          ? a.is_unlocked
          : filter === 'in_progress'
            ? !a.is_unlocked && a.progress > 0
            : !a.is_unlocked && a.progress === 0,
    )
    const byGroup = new Map<string, typeof items>()
    for (const a of items) byGroup.set(a.group, [...(byGroup.get(a.group) ?? []), a])
    return [...byGroup.entries()].sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))
  }, [query.data, filter])

  return (
    <>
      <PageHeader title={t('achievements.title')} subtitle={t('achievements.subtitle')} />
      {query.isPending ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} height={110} radius={18} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <Card className={styles.summary}>
            <span className={styles.summaryIcon} aria-hidden="true">
              <Trophy size={26} />
            </span>
            <div className={styles.summaryText}>
              <strong>{t('achievements.summary', { unlocked: query.data.unlocked, total: query.data.total })}</strong>
              <ProgressBar
                value={query.data.total ? query.data.unlocked / query.data.total : 0}
                label={t('achievements.summary', { unlocked: query.data.unlocked, total: query.data.total })}
              />
            </div>
          </Card>
          <Segmented
            label={t('gameZone.show')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('achievements.filterAll') },
              { value: 'unlocked', label: t('achievements.filterUnlocked') },
              { value: 'in_progress', label: t('achievements.filterInProgress') },
              { value: 'locked', label: t('achievements.filterLocked') },
            ]}
          />
          {groups.length === 0 ? (
            <EmptyState compact icon={<Trophy size={26} />} title={t('achievements.empty')} />
          ) : (
            groups.map(([group, items]) => (
              <Section key={group} id={`group-${group}`} title={t(`achievements.groups.${group}`, { defaultValue: group })}>
                <ul className={styles.grid}>
                  {items.map((a) => (
                    <li key={a.slug}>
                      <AchievementCard achievement={a} />
                    </li>
                  ))}
                </ul>
              </Section>
            ))
          )}
        </>
      )}
    </>
  )
}
