import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Gamepad2, Lock, Pencil, Sparkles, Trophy, Zap, Flame, Eye } from 'lucide-react'
import { Avatar, AVATAR_KEYS } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Controls'
import { EmptyState, ProgressBar, Skeleton } from '@/components/ui/Feedback'
import { FormError, TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Section, StatTile } from '@/components/ui/Surfaces'
import { useAuth, useUser } from '@/features/auth/AuthProvider'
import { AchievementBadge } from '@/features/achievements/AchievementBadge'
import { ApiError } from '@/lib/api/client'
import { meApi } from '@/lib/api/endpoints'
import { countryName, formatDate, formatNumber } from '@/lib/format'
import { useCategories, useHomeFeed } from '@/lib/queries'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { t } = useTranslation()
  const user = useUser()
  const { profile, stats, settings } = user
  const categories = useCategories()
  const feed = useHomeFeed()
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState<'profile' | 'interests' | null>(null)

  const interestCats = (categories.data ?? []).filter((c) => profile.interests.includes(c.slug))

  async function copyId() {
    try {
      await navigator.clipboard.writeText(profile.player_tag)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
      <section className={styles.hero} aria-labelledby="profile-name">
        <Avatar avatar={profile.avatar} size={104} />
        <div className={styles.identity}>
          <h1 id="profile-name" className={styles.name}>
            {profile.display_name}
          </h1>
          <div className={styles.tagRow}>
            <span className={styles.tagLabel}>{t('profile.playerId')}</span>
            <code className={styles.tag}>{profile.player_tag}</code>
            <button type="button" className={styles.copy} onClick={copyId} aria-label={t('profile.copyId')}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
            <span className="visually-hidden" aria-live="polite">
              {copied ? t('profile.copied') : ''}
            </span>
          </div>
          <p className={styles.meta}>
            {t('profile.memberSince', { date: formatDate(profile.created_at, { month: 'long', year: 'numeric' }) })}
            {profile.country && ` · ${countryName(profile.country)}`}
          </p>
          <div className={styles.level}>
            <span className={styles.levelBadge}>{t('common.level', { level: stats.level })}</span>
            <div className={styles.levelBar}>
              <ProgressBar value={stats.progress} label={t('progress.levelCard')} />
            </div>
          </div>
        </div>
        <Button variant="secondary" icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setEditing('profile')} className={styles.editBtn}>
          {t('profile.edit')}
        </Button>
      </section>

      <p className={styles.privacy}>
        {settings.profile_visible ? <Eye size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
        {settings.profile_visible ? t('profile.privacyPublic') : t('profile.privacyNote')}
      </p>

      <Section id="stats" title={t('profile.stats')}>
        <div className={styles.stats}>
          <StatTile icon={<Zap size={20} />} label={t('home.stat.xp')} value={formatNumber(stats.total_xp)} />
          <StatTile icon={<Gamepad2 size={20} />} tone="violet" label={t('home.stat.games')} value={formatNumber(stats.games_completed)} />
          <StatTile icon={<Trophy size={20} />} tone="gold" label={t('home.stat.achievements')} value={formatNumber(stats.achievements_unlocked)} />
          <StatTile icon={<Flame size={20} />} tone="pink" label={t('progress.longestStreak')} value={t('progress.days', { count: stats.longest_streak })} />
        </div>
      </Section>

      <Section
        id="interests"
        title={t('profile.interests')}
        action={
          <Button variant="ghost" size="sm" onClick={() => setEditing('interests')}>
            {t('profile.editInterests')}
          </Button>
        }
      >
        {categories.isPending ? (
          <Skeleton height={44} />
        ) : interestCats.length ? (
          <ul className={styles.interests}>
            {interestCats.map((c) => (
              <li key={c.slug}>
                <Link to={`/game-zone/category/${c.slug}`} className={styles.interest} style={{ '--c': c.color } as React.CSSProperties}>
                  <Icon name={c.icon} size={16} />
                  {t(`categories.${c.slug}`, { defaultValue: c.name })}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>{t('profile.interestsEmpty')}</p>
        )}
        <dl className={styles.prefs}>
          <div>
            <dt>{t('profile.playStyle')}</dt>
            <dd>{t(`onboarding.styles.${profile.play_preference}`)}</dd>
          </div>
          <div>
            <dt>{t('profile.dailyGoal')}</dt>
            <dd>{t('profile.goalMinutes', { count: profile.session_goal_minutes })}</dd>
          </div>
        </dl>
      </Section>

      <Section
        id="badges"
        title={t('profile.badges')}
        action={
          <Link to="/achievements" className={styles.link}>
            {t('home.viewAchievements')}
          </Link>
        }
      >
        {feed.data?.recent_achievements.length ? (
          <ul className={styles.badges}>
            {feed.data.recent_achievements.map((a) => (
              <li key={a.slug}>
                <AchievementBadge achievement={a} compact />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={<Sparkles size={26} />} title={t('home.achievementsNone')} />
        )}
      </Section>

      {editing === 'profile' && <EditProfileModal open onClose={() => setEditing(null)} />}
      {editing === 'interests' && <EditInterestsModal open onClose={() => setEditing(null)} />}
    </>
  )
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const user = useUser()
  const { setUser } = useAuth()
  const [name, setName] = useState(user.profile.display_name)
  const [avatar, setAvatar] = useState(user.profile.avatar)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      setUser(await meApi.updateProfile({ display_name: name.trim(), avatar }))
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldError('display_name') ?? err.message : t('errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('profile.editTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="edit-profile" loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="edit-profile" onSubmit={save} className={styles.form}>
        <FormError message={error} />
        <TextField label={t('auth.displayName')} hint={t('auth.displayNameHint')} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        <fieldset className={styles.avatarSet}>
          <legend>{t('onboarding.avatarLabel')}</legend>
          <div className={styles.avatarGrid}>
            {AVATAR_KEYS.map((key) => (
              <label key={key} className={`${styles.avatarOption} ${avatar === key ? styles.avatarActive : ''}`}>
                <input type="radio" name="edit-avatar" value={key} checked={avatar === key} onChange={() => setAvatar(key)} className="visually-hidden" aria-label={key} />
                <Avatar avatar={key} size={48} />
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}

function EditInterestsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const user = useUser()
  const { setUser } = useAuth()
  const categories = useCategories()
  const [selected, setSelected] = useState<string[]>(user.profile.interests)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  async function save() {
    setSaving(true)
    setError(undefined)
    try {
      setUser(await meApi.updateProfile({ interests: selected }))
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('profile.editInterests')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <div className={styles.chipGrid}>
        {(categories.data ?? []).map((c) => (
          <Chip
            key={c.slug}
            selected={selected.includes(c.slug)}
            color={c.color}
            icon={<Icon name={c.icon} size={16} />}
            onClick={() => setSelected((s) => (s.includes(c.slug) ? s.filter((x) => x !== c.slug) : [...s, c.slug]))}
          >
            {t(`categories.${c.slug}`, { defaultValue: c.name })}
          </Chip>
        ))}
      </div>
    </Modal>
  )
}
