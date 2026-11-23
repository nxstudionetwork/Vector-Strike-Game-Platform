/** Detailed statistics, derived only from stored sessions (GET /api/me/stats/). */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Award, BarChart3, CheckCircle2, Clock, Crosshair, Gamepad2, Medal, Timer, TrendingUp } from 'lucide-react'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { Card, PageHeader, Section, StatCard } from '@/components/ui/Surfaces'
import type { CategoryStat } from '@/lib/api/types'
import { formatDuration, formatNumber, formatPercent, formatRelative } from '@/lib/format'
import { useStats } from '@/lib/queries'
import styles from './StatsPage.module.css'

function CategoryHighlight({ title, cat, hint }: { title: string; cat: CategoryStat | null; hint?: string }) {
  const { t } = useTranslation()
  return (
    <Card className={styles.highlight} style={{ '--c': cat?.color ?? 'var(--text-subtle)' } as React.CSSProperties}>
      <p className={styles.kicker}>{title}</p>
      {cat ? (
        <div className={styles.highlightRow}>
          <span className={styles.highlightIcon} aria-hidden="true">
            <Icon name={cat.icon} size={24} />
          </span>
          <div>
            <strong>{t(`categories.${cat.slug}`, { defaultValue: cat.name })}</strong>
            <span>
              {t('stats.sessions', { count: cat.sessions })} · {t('stats.avgPerformance', { value: formatPercent(cat.average_performance) })}
            </span>
          </div>
        </div>
      ) : (
        <p className={styles.muted}>
          {t('stats.notEnough')}
          {hint && <span className={styles.hint}>{hint}</span>}
        </p>
      )}
    </Card>
  )
}

export default function StatsPage() {
  const { t } = useTranslation()
  const query = useStats()

  if (query.isPending) {
    return (
      <>
        <PageHeader title={t('stats.title')} subtitle={t('stats.subtitle')} />
        <Skeleton height={200} radius={18} />
        <Skeleton height={260} radius={18} />
      </>
    )
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title={t('stats.title')} />
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </>
    )
  }

  const { totals, highest_score: hs, favorite_category, strongest_category, categories, recent_activity } = query.data
  const dash = t('profile.none')
  const pct = (v: number | null) => (v == null ? dash : formatPercent(v))

  return (
    <>
      <PageHeader title={t('stats.title')} subtitle={t('stats.subtitle')} />

      {totals.sessions === 0 && <EmptyState compact icon={<BarChart3 size={26} />} title={t('stats.empty')} />}

      <div className={styles.grid4}>
        <StatCard icon={<Gamepad2 size={20} />} label={t('stats.totalSessions')} value={formatNumber(totals.sessions)} />
        <StatCard icon={<Clock size={20} />} label={t('stats.playTime')} value={formatDuration(totals.play_seconds)} tone="green" />
        <StatCard icon={<TrendingUp size={20} />} label={t('stats.averageScore')} value={pct(totals.average_performance)} tone="violet" />
        <StatCard icon={<Crosshair size={20} />} label={t('stats.averageAccuracy')} value={pct(totals.average_accuracy)} tone="pink" />
        <StatCard icon={<CheckCircle2 size={20} />} label={t('stats.completionRate')} value={pct(totals.completion_rate)} tone="green" />
        <StatCard icon={<Medal size={20} />} label={t('progress.totalCompleted')} value={formatNumber(totals.games_completed)} tone="gold" />
        <StatCard
          icon={<Timer size={20} />}
          label={t('stats.avgSession')}
          value={totals.average_session_seconds == null ? dash : formatDuration(totals.average_session_seconds)}
        />
        <StatCard
          icon={<Award size={20} />}
          label={t('stats.highestScore')}
          value={hs ? formatNumber(hs.score) : dash}
          tone="gold"
        />
      </div>
      {hs && (
        <p className={styles.muted}>
          {t('stats.highestScore')}: <Link to={`/game/${hs.game.slug}`}>{hs.game.title}</Link> · {formatNumber(hs.score)}{' '}
          {t('stats.ofMax', { max: formatNumber(hs.max_score) })} · {formatRelative(hs.date)}
        </p>
      )}

      <div className={styles.grid2}>
        <CategoryHighlight title={t('stats.favoriteCategory')} cat={favorite_category} />
        <CategoryHighlight title={t('stats.strongestCategory')} cat={strongest_category} hint={t('stats.strongestHint')} />
      </div>

      <div className={styles.grid2}>
        <Section id="by-category" title={t('stats.byCategory')}>
          <Card>
            {categories.length === 0 ? (
              <p className={styles.muted}>{t('progress.categoriesEmpty')}</p>
            ) : (
              <ul className={styles.catList}>
                {categories.map((c) => (
                  <li key={c.slug} style={{ '--c': c.color } as React.CSSProperties}>
                    <span className={styles.catIcon} aria-hidden="true">
                      <Icon name={c.icon} size={16} />
                    </span>
                    <div className={styles.catBody}>
                      <div className={styles.catHead}>
                        <strong>{t(`categories.${c.slug}`, { defaultValue: c.name })}</strong>
                        <span>
                          {formatPercent(c.average_performance)} · {t('stats.sessions', { count: c.sessions })}
                        </span>
                      </div>
                      <ProgressBar value={c.average_performance} size="sm" tone="accent" label={c.name} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>

        <Section id="recent" title={t('stats.recent')}>
          <Card>
            {recent_activity.length === 0 ? (
              <p className={styles.muted}>{t('progress.recentEmpty')}</p>
            ) : (
              <ul className={styles.recent}>
                {recent_activity.map((s) => (
                  <li key={s.id}>
                    <div>
                      <Link to={`/game/${s.game}`}>{s.game_title}</Link>
                      <span>
                        {s.category} · {s.ended_at ? formatRelative(s.ended_at) : ''}
                      </span>
                    </div>
                    <strong>{formatNumber(s.score)}</strong>
                    <span className={styles.xp}>+{formatNumber(s.xp_awarded)} XP</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>
      </div>
    </>
  )
}
