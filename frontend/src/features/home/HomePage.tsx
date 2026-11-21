import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CalendarCheck, CheckCircle2, Coins, Flame, Gamepad2, Rocket, Target, Trophy, Zap } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, ErrorState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { Icon } from '@/components/ui/Icon'
import { Card, Section, StatTile } from '@/components/ui/Surfaces'
import { GameRail } from '@/components/game/GameCard'
import { AchievementBadge } from '@/features/achievements/AchievementBadge'
import { useUser } from '@/features/auth/AuthProvider'
import { formatNumber } from '@/lib/format'
import { useHomeFeed } from '@/lib/queries'
import styles from './HomePage.module.css'

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'home.greeting.morning'
  if (h < 18) return 'home.greeting.afternoon'
  return 'home.greeting.evening'
}

export default function HomePage() {
  const { t } = useTranslation()
  const user = useUser()
  const feed = useHomeFeed()
  // The shell's user snapshot keeps the hero useful while the feed loads.
  const stats = feed.data?.stats ?? user.stats

  return (
    <>
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        aria-labelledby="home-greeting"
      >
        <div className={styles.heroMain}>
          <Avatar avatar={user.profile.avatar} size={64} />
          <div className={styles.heroText}>
            <h1 id="home-greeting" className={styles.greeting}>
              {t(greetingKey(), { name: user.profile.display_name })}
            </h1>
            <p className={styles.ready}>{t('home.ready')}</p>
          </div>
        </div>
        <div className={styles.heroLevel}>
          <div className={styles.levelRow}>
            <span className={styles.levelBadge}>{t('common.level', { level: stats.level })}</span>
            <span className={styles.levelHint}>
              {t('home.xpToNext', { value: formatNumber(stats.xp_to_next_level), level: stats.level + 1 })}
            </span>
          </div>
          <ProgressBar value={stats.progress} size="lg" label={t('progress.levelCard')} />
          <p className={styles.streak}>
            <Flame size={16} aria-hidden="true" className={stats.current_streak ? styles.flameOn : ''} />
            {stats.current_streak
              ? `${t('home.streak', { count: stats.current_streak })}${stats.played_today ? '' : ` · ${t('home.streakKeep')}`}`
              : t('home.streakNone')}
          </p>
        </div>
        <ButtonLink to="/game-zone" variant="glow" size="lg" icon={<Gamepad2 size={20} aria-hidden="true" />} className={styles.heroCta}>
          {t('home.enterGameZone')}
        </ButtonLink>
      </motion.section>

      {feed.isPending ? (
        <HomeSkeleton />
      ) : feed.isError ? (
        <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
      ) : (
        <>
          {feed.data.catalog.live_games === 0 && (
            <Card glow className={styles.launching}>
              <span className={styles.launchIcon} aria-hidden="true">
                <Rocket size={26} />
              </span>
              <div className={styles.launchText}>
                <h2>{t('home.launchingTitle')}</h2>
                <p>{t('home.launchingBody')}</p>
              </div>
              <ButtonLink to="/game-zone" variant="secondary" iconEnd={<ArrowRight size={18} aria-hidden="true" />}>
                {t('home.launchingCta')}
              </ButtonLink>
            </Card>
          )}

          {feed.data.continue_playing.length > 0 && (
            <Section id="continue" title={t('home.continueTitle')}>
              <GameRail games={feed.data.continue_playing} showProgress />
            </Section>
          )}

          <div className={styles.twoCol}>
            <Section id="daily" title={t('home.dailyTitle')}>
              {feed.data.daily_challenge ? (
                <Card className={styles.daily}>
                  <div className={styles.dailyHead}>
                    <span className={styles.dailyIcon} aria-hidden="true">
                      <Target size={22} />
                    </span>
                    <div>
                      <h3>{feed.data.daily_challenge.title}</h3>
                      <p>{feed.data.daily_challenge.description}</p>
                    </div>
                  </div>
                  <p className={styles.dailyReward}>
                    <Zap size={16} aria-hidden="true" />
                    {t('home.dailyReward', {
                      xp: feed.data.daily_challenge.xp_reward,
                      coins: feed.data.daily_challenge.coin_reward,
                    })}
                  </p>
                  {feed.data.daily_challenge.completed ? (
                    <p className={styles.dailyDone}>
                      <CheckCircle2 size={18} aria-hidden="true" /> {t('home.dailyDone')}
                    </p>
                  ) : (
                    <ButtonLink to={`/game/${feed.data.daily_challenge.game.slug}`} variant="primary">
                      {t('home.dailyPlay')}
                    </ButtonLink>
                  )}
                </Card>
              ) : (
                <EmptyState compact icon={<CalendarCheck size={26} />} title={t('home.dailyNone')} body={t('home.dailyNoneBody')} />
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
                <StatTile icon={<Zap size={20} />} label={t('home.stat.xp')} value={formatNumber(stats.total_xp)} />
                <StatTile icon={<Gamepad2 size={20} />} label={t('home.stat.games')} value={formatNumber(stats.games_completed)} tone="violet" />
                <StatTile icon={<Trophy size={20} />} label={t('home.stat.achievements')} value={formatNumber(stats.achievements_unlocked)} tone="gold" />
                <StatTile icon={<Coins size={20} />} label={t('home.stat.coins')} value={formatNumber(stats.coins)} tone="green" />
              </div>
            </Section>
          </div>

          {feed.data.recommended.games.length > 0 && (
            <Section
              id="recommended"
              title={t('home.recommendedTitle')}
              subtitle={feed.data.recommended.reason === 'interests' ? t('home.recommendedInterests') : t('home.recommendedLevel')}
            >
              <GameRail games={feed.data.recommended.games} />
            </Section>
          )}

          {feed.data.featured.length > 0 && (
            <Section id="featured" title={t('home.featuredTitle')}>
              <GameRail games={feed.data.featured} />
            </Section>
          )}

          {feed.data.new_games.length > 0 && (
            <Section id="new" title={t('home.newTitle')}>
              <GameRail games={feed.data.new_games} />
            </Section>
          )}

          <Section
            id="recent-achievements"
            title={t('home.achievementsTitle')}
            action={
              <Link to="/achievements" className={styles.sectionLink}>
                {t('home.viewAchievements')}
              </Link>
            }
          >
            {feed.data.recent_achievements.length ? (
              <ul className={styles.achievements}>
                {feed.data.recent_achievements.map((a) => (
                  <li key={a.slug}>
                    <AchievementBadge achievement={a} compact />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={<Trophy size={26} />} title={t('home.achievementsNone')} />
            )}
          </Section>

          <Section id="explore" title={t('home.categoriesTitle')} subtitle={t('home.gameZoneBody', { count: feed.data.categories.length })}>
            <ul className={styles.categories}>
              {feed.data.categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/game-zone/category/${c.slug}`}
                    className={styles.category}
                    style={{ '--c': c.color } as React.CSSProperties}
                  >
                    <span className={styles.categoryIcon} aria-hidden="true">
                      <Icon name={c.icon} size={22} />
                    </span>
                    <span className={styles.categoryName}>{t(`categories.${c.slug}`, { defaultValue: c.name })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </>
  )
}

function HomeSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <Skeleton height={140} radius={18} />
      <div className={styles.twoCol}>
        <Skeleton height={180} radius={18} />
        <Skeleton height={180} radius={18} />
      </div>
      <Skeleton height={220} radius={18} />
    </div>
  )
}
