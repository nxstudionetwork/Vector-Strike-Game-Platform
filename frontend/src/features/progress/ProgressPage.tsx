import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, CalendarDays, Clock, Flame, Gamepad2, Medal, Sparkles, Star, Target, Zap } from 'lucide-react'
import { Segmented } from '@/components/ui/Controls'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { Card, PageHeader, Section, StatCard } from '@/components/ui/Surfaces'
import { formatDuration, formatNumber, formatPercent, formatRelative } from '@/lib/format'
import { useProgress } from '@/lib/queries'
import { ActivityChart } from './ActivityChart'
import styles from './ProgressPage.module.css'

const RANGES = [7, 14, 30] as const

export default function ProgressPage() {
  const { t } = useTranslation()
  const [days, setDays] = useState<number>(14)
  const query = useProgress(days)

  if (query.isPending) {
    return (
      <>
        <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle')} />
        <div className={styles.grid}>
          <Skeleton height={160} radius={18} />
          <Skeleton height={160} radius={18} />
        </div>
        <Skeleton height={240} radius={18} />
      </>
    )
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title={t('progress.title')} />
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </>
    )
  }

  const { stats, activity, this_week: week, categories, personal_records, recent_sessions } = query.data
  const hasActivity = activity.some((d) => d.xp > 0 || d.sessions > 0)
  // Skill progress = completed ÷ live games in each world (only worlds with games or activity).
  const playedCategories = categories
    .filter((c) => c.live_games > 0 || c.sessions > 0)
    .map((c) => ({ ...c, pct: c.live_games ? Math.min(c.games_completed / c.live_games, 1) : 0 }))
    .sort((a, b) => b.pct - a.pct || b.xp - a.xp)

  return (
    <>
      <PageHeader title={t('progress.title')} subtitle={t('progress.subtitle')} />

      <div className={styles.grid}>
        <Card className={styles.levelCard}>
          <p className={styles.kicker}>{t('progress.levelCard')}</p>
          <div className={styles.levelRow}>
            <span className={styles.levelNum}>{stats.level}</span>
            <div className={styles.levelInfo}>
              <ProgressBar value={stats.progress} size="lg" label={t('progress.levelCard')} />
              <span>
                {stats.progress >= 1 && stats.xp_to_next_level === 0
                  ? t('progress.maxLevel')
                  : t('progress.xpOf', {
                      current: formatNumber(stats.xp_into_level),
                      target: formatNumber(stats.next_level_xp - stats.level_floor_xp),
                    })}
              </span>
            </div>
          </div>
          <p className={styles.muted}>{t('home.xpToNext', { value: formatNumber(stats.xp_to_next_level), level: stats.level + 1 })}</p>
        </Card>
        <Card>
          <p className={styles.kicker}>{t('progress.streaks')}</p>
          <div className={styles.streaks}>
            <StatCard icon={<Flame size={20} />} tone="pink" label={t('progress.currentStreak')} value={t('progress.days', { count: stats.current_streak })} />
            <StatCard icon={<Star size={20} />} tone="gold" label={t('progress.longestStreak')} value={t('progress.days', { count: stats.longest_streak })} />
          </div>
        </Card>
      </div>

      <Section
        id="activity"
        title={t('progress.activity')}
        subtitle={t('progress.activityRange', { days })}
        action={
          <div className={styles.range}>
            <Segmented
              label={t('progress.activity')}
              value={String(days)}
              onChange={(v) => setDays(Number(v))}
              options={RANGES.map((r) => ({ value: String(r), label: t(`progress.range${r}`) }))}
            />
          </div>
        }
      >
        <Card>
          {hasActivity ? <ActivityChart days={activity} /> : <EmptyState compact icon={<BarChart3 size={26} />} title={t('progress.noActivity')} />}
        </Card>
      </Section>

      <Section id="week" title={t('progress.thisWeek')}>
        <div className={styles.stats4}>
          <StatCard icon={<Zap size={20} />} label={t('progress.weekXp')} value={formatNumber(week.xp)} />
          <StatCard icon={<Gamepad2 size={20} />} tone="violet" label={t('progress.weekSessions')} value={formatNumber(week.sessions)} />
          <StatCard icon={<Clock size={20} />} tone="green" label={t('progress.weekTime')} value={formatDuration(week.play_seconds)} />
          <StatCard icon={<CalendarDays size={20} />} tone="gold" label={t('progress.weekDays')} value={`${week.active_days}/7`} />
        </div>
      </Section>

      <Section id="totals" title={t('progress.totals')}>
        <div className={styles.stats4}>
          <StatCard icon={<Gamepad2 size={20} />} label={t('progress.totalSessions')} value={formatNumber(stats.sessions_completed)} />
          <StatCard icon={<Medal size={20} />} tone="violet" label={t('progress.totalCompleted')} value={formatNumber(stats.games_completed)} />
          <StatCard icon={<Sparkles size={20} />} tone="gold" label={t('progress.totalPerfect')} value={formatNumber(stats.perfect_scores)} />
          <StatCard icon={<Target size={20} />} tone="pink" label={t('progress.totalChallenges')} value={formatNumber(stats.daily_challenges_completed)} />
        </div>
      </Section>

      <div className={styles.grid}>
        <Section id="mastery" title={t('progress.categories')}>
          <Card>
            {playedCategories.length === 0 ? (
              <EmptyState compact icon={<Icon name="compass" size={26} />} title={t('progress.categoriesEmpty')} />
            ) : (
              <ul className={styles.catList}>
                {playedCategories.map((c) => (
                  <li key={c.slug} style={{ '--c': c.color } as React.CSSProperties}>
                    <span className={styles.catIcon} aria-hidden="true">
                      <Icon name={c.icon} size={18} />
                    </span>
                    <div className={styles.catBody}>
                      <div className={styles.catHead}>
                        <strong>{t(`categories.${c.slug}`, { defaultValue: c.name })}</strong>
                        <span>
                          <strong className={styles.pct}>{formatPercent(c.pct)}</strong> ·{' '}
                          {t('progress.categoryLine', { completed: c.games_completed, xp: formatNumber(c.xp) })}
                        </span>
                      </div>
                      <ProgressBar value={c.pct} size="sm" tone="accent" label={c.name} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>

        <Section id="records" title={t('progress.records')}>
          <Card>
            {personal_records.length === 0 ? (
              <EmptyState compact icon={<Medal size={26} />} title={t('progress.recordsEmpty')} />
            ) : (
              <ol className={styles.records}>
                {personal_records.map((r) => (
                  <li key={r.game.slug}>
                    <Link to={`/game/${r.game.slug}`}>{r.game.title}</Link>
                    <span className={styles.muted}>{r.game.category}</span>
                    <strong>{formatNumber(r.best_score)}</strong>
                    {r.best_accuracy !== null && <span className={styles.muted}>{formatPercent(r.best_accuracy)}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </Section>
      </div>

      <Section id="recent" title={t('progress.recent')}>
        <Card>
          {recent_sessions.length === 0 ? (
            <EmptyState compact icon={<Gamepad2 size={26} />} title={t('progress.recentEmpty')} />
          ) : (
            <ul className={styles.recent}>
              {recent_sessions.map((s) => (
                <li key={s.id}>
                  <Link to={`/game/${s.game}`}>{s.game_title}</Link>
                  <span className={styles.muted}>{s.ended_at ? formatRelative(s.ended_at) : ''}</span>
                  <span>{formatNumber(s.score)}</span>
                  <span className={styles.xp}>+{formatNumber(s.xp_awarded)} XP</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Section>
    </>
  )
}
