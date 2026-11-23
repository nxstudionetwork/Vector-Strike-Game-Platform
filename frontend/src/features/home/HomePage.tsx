/**
 * Home dashboard. Section order:
 * Welcome · Continue playing / first challenge · Daily challenge · Game Zone ·
 * Recommended · Recent achievements · Your progress · Discover
 * Every value comes from GET /api/me/home/.
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Coins, Flame, Gamepad2, Rocket, Target, Trophy, Zap } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { Card, Section, StatCard } from '@/components/ui/Surfaces'
import { XPBar } from '@/components/ui/XPBar'
import { CategoryGrid } from '@/components/game/CategoryCard'
import { GameRail } from '@/components/game/GameCard'
import { AchievementCard } from '@/features/achievements/AchievementCard'
import { DailyChallengeCard } from '@/features/challenge/DailyChallengeCard'
import { useUser } from '@/features/auth/AuthProvider'
import { formatNumber, formatPercent } from '@/lib/format'
import { useHomeFeed } from '@/lib/queries'
import styles from './HomePage.module.css'

function GoalRing({ playedSeconds, goalMinutes }: { playedSeconds: number; goalMinutes: number }) {
  const { t } = useTranslation()
  const played = Math.floor(playedSeconds / 60)
  const ratio = Math.min(playedSeconds / 60 / Math.max(goalMinutes, 1), 1)
  const r = 26
  const c = 2 * Math.PI * r
  const label = ratio >= 1 ? t('home.dailyGoalDone') : t('home.dailyGoalValue', { played, goal: goalMinutes })
  return (
    <div className={styles.goal}>
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${t('home.dailyGoal')}: ${label}`}>
        <circle cx="32" cy="32" r={r} className={styles.goalTrack} />
        <circle
          cx="32"
          cy="32"
          r={r}
          className={styles.goalFill}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="37" textAnchor="middle" className={styles.goalText}>
          {formatPercent(ratio)}
        </text>
      </svg>
      <div>
        <p className={styles.goalTitle}>{t('home.dailyGoal')}</p>
        <p className={styles.goalSub}>{label}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  const user = useUser()
  const feed = useHomeFeed()
  const stats = feed.data?.stats ?? user.stats
  const name = user.profile.display_name
  const isNew = stats.sessions_completed === 0

  return (
    <>
      <section className={styles.hero} aria-labelledby="home-greeting">
        <div className={styles.heroMain}>
          <Avatar avatar={user.profile.avatar} size={64} />
          <div className={styles.heroText}>
            <h1 id="home-greeting" className={styles.greeting}>
              {isNew ? t('home.welcomeNew', { name }) : t('home.welcomeBack', { name })}
            </h1>
            <p className={styles.ready}>{t('home.ready')}</p>
          </div>
        </div>
        <div className={styles.heroLevel}>
          <XPBar stats={stats} size="lg" />
          <p className={styles.streak}>
            <Flame size={16} aria-hidden="true" className={stats.current_streak ? styles.flameOn : ''} />
            {stats.current_streak
              ? `${t('home.streak', { count: stats.current_streak })}${stats.played_today ? '' : ` · ${t('home.streakKeep')}`}`
              : t('home.streakNone')}
          </p>
        </div>
        {feed.data && <GoalRing playedSeconds={feed.data.today.play_seconds} goalMinutes={feed.data.today.goal_minutes} />}
      </section>

      {feed.isPending ? (
        <div className={styles.skeleton} aria-hidden="true">
          <Skeleton height={220} radius={24} />
          <Skeleton height={160} radius={24} />
          <Skeleton height={240} radius={24} />
        </div>
      ) : feed.isError ? (
        <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
      ) : (
        <>
          {feed.data.continue_playing.length > 0 ? (
            <Section id="continue" title={t('home.continueTitle')}>
              <GameRail games={feed.data.continue_playing} />
            </Section>
          ) : (
            isNew && (
              <Card className={styles.firstRun}>
                <span className={styles.firstIcon} aria-hidden="true">
                  <Rocket size={26} />
                </span>
                <div className={styles.firstText}>
                  <h2>{t('home.startFirstTitle')}</h2>
                  <p>{t('home.startFirstBody')}</p>
                </div>
                <ButtonLink to="/game-zone" variant="glow" iconEnd={<ArrowRight size={18} aria-hidden="true" />}>
                  {t('home.exploreGameZone')}
                </ButtonLink>
              </Card>
            )
          )}

          <Section
            id="daily"
            title={t('home.todayChallenge')}
            action={
              <Link to="/challenge" className={styles.sectionLink}>
                {t('home.viewChallenges')}
              </Link>
            }
          >
            <DailyChallengeCard challenge={feed.data.daily_challenge} />
          </Section>

          <section className={styles.zone} aria-labelledby="zone-title">
            <div className={styles.zoneHead}>
              <div>
                <p className={styles.zoneKicker}>
                  <Gamepad2 size={16} aria-hidden="true" /> {t('nav.gameZone')}
                </p>
                <h2 id="zone-title" className={styles.zoneTitle}>
                  {t('home.gzTagline')}
                </h2>
                <p className={styles.zoneBody}>
                  {feed.data.catalog.live_games === 0 ? t('home.launchingBody') : t('home.gameZoneBody', { count: feed.data.categories.length })}
                </p>
              </div>
              <ButtonLink to="/game-zone" variant="glow" size="lg" iconEnd={<ArrowRight size={20} aria-hidden="true" />}>
                {t('home.exploreGameZone')}
              </ButtonLink>
            </div>
            {feed.data.featured.length > 0 ? (
              <GameRail games={feed.data.featured} />
            ) : (
              <CategoryGrid categories={feed.data.categories.slice(0, 8)} compact />
            )}
          </section>

          {feed.data.recommended.games.length > 0 && (
            <Section
              id="recommended"
              title={t('home.recommendedTitle')}
              subtitle={feed.data.recommended.reason === 'interests' ? t('home.recommendedInterests') : t('home.recommendedLevel')}
              action={
                <Link to="/game-zone?filter=recommended" className={styles.sectionLink}>
                  {t('common.seeAll')}
                </Link>
              }
            >
              <GameRail games={feed.data.recommended.games} />
            </Section>
          )}

          <div className={styles.twoCol}>
            <Section
              id="recent-achievements"
              title={t('home.achievementsTitle')}
              action={
                <Link to="/achievements" className={styles.sectionLink}>
                  {t('common.seeAll')}
                </Link>
              }
            >
              {feed.data.recent_achievements.length ? (
                <ul className={styles.achievements}>
                  {feed.data.recent_achievements.slice(0, 3).map((a) => (
                    <li key={a.slug}>
                      <AchievementCard achievement={a} compact />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={<Trophy size={26} />} title={t('home.achievementsNone')} />
              )}
            </Section>

            <Section
              id="progress-preview"
              title={t('home.progressTitle')}
              action={
                <Link to="/progress" className={styles.sectionLink}>
                  {t('home.viewStats')}
                </Link>
              }
            >
              <div className={styles.stats}>
                <StatCard icon={<Zap size={20} />} label={t('home.stat.xp')} value={formatNumber(stats.total_xp)} />
                <StatCard icon={<Gamepad2 size={20} />} label={t('home.stat.games')} value={formatNumber(stats.games_completed)} tone="violet" />
                <StatCard icon={<Flame size={20} />} label={t('home.stat.streak')} value={formatNumber(stats.current_streak)} tone="pink" />
                <StatCard icon={<Coins size={20} />} label={t('home.stat.coins')} value={formatNumber(stats.coins)} tone="gold" />
              </div>
              <CategoryProgressList categories={feed.data.categories} />
            </Section>
          </div>

          <Section id="discover" title={t('home.discoverTitle')}>
            {feed.data.new_games.length > 0 && (
              <div className={styles.discoverBlock}>
                <h3 className={styles.h3}>{t('home.discoverNew')}</h3>
                <GameRail games={feed.data.new_games} />
              </div>
            )}
            <Link to="/challenge" className={styles.discoverLink}>
              <span className={styles.discoverIcon} aria-hidden="true">
                <Target size={22} />
              </span>
              <span>
                <strong>{t('home.discoverChallenges')}</strong>
                <span>{t('home.discoverChallengesBody')}</span>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <div className={styles.discoverBlock}>
              <h3 className={styles.h3}>{t('home.discoverWorlds')}</h3>
              <CategoryGrid categories={feed.data.categories} compact />
            </div>
          </Section>
        </>
      )}
    </>
  )
}

function CategoryProgressList({ categories }: { categories: { slug: string; name: string; icon: string; color: string; live_games: number; completed_games: number }[] }) {
  const { t } = useTranslation()
  const withGames = categories.filter((c) => c.live_games > 0).sort((a, b) => b.completed_games / b.live_games - a.completed_games / a.live_games).slice(0, 4)
  if (!withGames.length) return <p className={styles.muted}>{t('home.categoryProgressEmpty')}</p>
  return (
    <ul className={styles.catProgress} aria-label={t('home.categoryProgress')}>
      {withGames.map((c) => (
        <li key={c.slug} style={{ '--c': c.color } as React.CSSProperties}>
          <Icon name={c.icon} size={16} aria-hidden="true" />
          <span className={styles.catName}>{t(`categories.${c.slug}`, { defaultValue: c.name })}</span>
          <ProgressBar value={c.completed_games / c.live_games} size="sm" tone="accent" label={c.name} />
          <span className={styles.catPct}>{formatPercent(c.completed_games / c.live_games)}</span>
        </li>
      ))}
    </ul>
  )
}
