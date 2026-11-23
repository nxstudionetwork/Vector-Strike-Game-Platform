import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CheckCircle2, Circle, Clock, Coins, Target } from 'lucide-react'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Card, PageHeader, Section } from '@/components/ui/Surfaces'
import { formatDay, formatNumber } from '@/lib/format'
import { useChallenges } from '@/lib/queries'
import { DailyChallengeCard } from './DailyChallengeCard'
import styles from './ChallengePage.module.css'

export default function ChallengePage() {
  const { t } = useTranslation()
  const query = useChallenges()

  return (
    <>
      <PageHeader
        title={t('challenge.title')}
        subtitle={t('challenge.subtitle')}
        action={
          query.data && (
            <span className={styles.total}>
              <CheckCircle2 size={16} aria-hidden="true" /> {t('challenge.totalCompleted', { count: query.data.total_completed })}
            </span>
          )
        }
      />

      {query.isPending ? (
        <Skeleton height={260} radius={24} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <DailyChallengeCard challenge={query.data.today} />

          <div className={styles.columns}>
            <Section id="history" title={t('challenge.history')}>
              {query.data.history.length === 0 ? (
                <EmptyState compact icon={<CalendarDays size={26} />} title={t('challenge.historyEmpty')} />
              ) : (
                <ul className={styles.history}>
                  {query.data.history.map((c) => (
                    <li key={c.id} className={c.completed ? styles.done : ''}>
                      <span className={styles.status} aria-hidden="true">
                        {c.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </span>
                      <div className={styles.historyText}>
                        <strong>{c.title}</strong>
                        <span>
                          {formatDay(c.date, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                          <Link to={`/game/${c.game.slug}`}>{c.game.title}</Link>
                        </span>
                      </div>
                      <span className={styles.badge}>
                        {c.completed ? t('challenge.completed') : t('challenge.missed')} · +{formatNumber(c.xp_reward)} XP
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section id="how" title={t('challenge.howTitle')}>
              <Card>
                <ol className={styles.how}>
                  <li>
                    <Clock size={20} aria-hidden="true" /> {t('challenge.how1')}
                  </li>
                  <li>
                    <Target size={20} aria-hidden="true" /> {t('challenge.how2')}
                  </li>
                  <li>
                    <Coins size={20} aria-hidden="true" /> {t('challenge.how3')}
                  </li>
                </ol>
              </Card>
            </Section>
          </div>
        </>
      )}
    </>
  )
}
