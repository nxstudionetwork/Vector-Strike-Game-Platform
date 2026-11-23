/** Player identity page: who you are, what you've done, and what you're into. */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Eye, Flame, Gamepad2, Lock, Pencil, SlidersHorizontal, Sparkles, Trophy } from 'lucide-react'
import { Avatar, AVATAR_KEYS } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Chip, Segmented } from '@/components/ui/Controls'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { FormError, TextField } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Card, Section, StatCard } from '@/components/ui/Surfaces'
import { XPBar } from '@/components/ui/XPBar'
import { useToast } from '@/components/feedback/Toast'
import { useAuth, useUser } from '@/features/auth/AuthProvider'
import { AchievementCard } from '@/features/achievements/AchievementCard'
import { ApiError } from '@/lib/api/client'
import { meApi } from '@/lib/api/endpoints'
import type { PlayPreference } from '@/lib/api/types'
import { countryName, formatDate, formatNumber, formatRelative } from '@/lib/format'
import { useCategories, useHomeFeed, useStats } from '@/lib/queries'
import styles from './ProfilePage.module.css'

type Editing = 'profile' | 'interests' | 'preferences' | null

export default function ProfilePage() {
  const { t } = useTranslation()
  const user = useUser()
  const { profile, stats, settings } = user
  const categories = useCategories()
  const feed = useHomeFeed()
  const statsQuery = useStats()
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)
  const interestCats = (categories.data ?? []).filter((c) => profile.interests.includes(c.slug))
  const fav = statsQuery.data?.favorite_category

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
            <XPBar stats={stats} />
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

      <div className={styles.stats}>
        <StatCard icon={<Trophy size={20} />} tone="gold" label={t('home.stat.achievements')} value={formatNumber(stats.achievements_unlocked)} />
        <StatCard icon={<Gamepad2 size={20} />} tone="violet" label={t('home.stat.games')} value={formatNumber(stats.games_completed)} />
        <StatCard icon={<Flame size={20} />} tone="pink" label={t('profile.currentStreak')} value={t('progress.days', { count: stats.current_streak })} />
        <StatCard
          icon={fav ? <Icon name={fav.icon} size={20} /> : <Sparkles size={20} />}
          label={t('profile.favoriteCategory')}
          value={fav ? t(`categories.${fav.slug}`, { defaultValue: fav.name }) : t('profile.none')}
        />
      </div>

      <div className={styles.columns}>
        <Section id="recent" title={t('profile.recentActivity')}>
          <Card>
            {statsQuery.isPending ? (
              <Skeleton height={120} />
            ) : !statsQuery.data?.recent_activity.length ? (
              <p className={styles.muted}>{t('profile.recentEmpty')}</p>
            ) : (
              <ul className={styles.recent}>
                {statsQuery.data.recent_activity.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <div>
                      <Link to={`/game/${s.game}`}>{s.game_title}</Link>
                      <span>{s.ended_at ? formatRelative(s.ended_at) : ''}</span>
                    </div>
                    <span className={styles.xp}>+{formatNumber(s.xp_awarded)} XP</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
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
          <div className={styles.prefsRow}>
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
            <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={16} aria-hidden="true" />} onClick={() => setEditing('preferences')}>
              {t('profile.editPreferences')}
            </Button>
          </div>
        </Section>
      </div>

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
                <AchievementCard achievement={a} compact />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={<Sparkles size={26} />} title={t('home.achievementsNone')} />
        )}
      </Section>

      {editing === 'profile' && <EditProfileModal onClose={() => setEditing(null)} />}
      {editing === 'interests' && <EditInterestsModal onClose={() => setEditing(null)} />}
      {editing === 'preferences' && <EditPreferencesModal onClose={() => setEditing(null)} />}
    </>
  )
}

function useSaveProfile(onDone: () => void) {
  const { t } = useTranslation()
  const { setUser } = useAuth()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  async function save(patch: Parameters<typeof meApi.updateProfile>[0], field?: string) {
    setSaving(true)
    setError(undefined)
    try {
      setUser(await meApi.updateProfile(patch))
      toast.success(t('toast.profileSaved'))
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? (field && err.fieldError(field)) || err.message : t('errors.generic'))
    } finally {
      setSaving(false)
    }
  }
  return { save, saving, error }
}

function ModalFooter({ onClose, saving, form, onSave }: { onClose: () => void; saving: boolean; form?: string; onSave?: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button type={form ? 'submit' : 'button'} form={form} onClick={onSave} loading={saving}>
        {t('common.save')}
      </Button>
    </>
  )
}

function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const user = useUser()
  const [name, setName] = useState(user.profile.display_name)
  const [avatar, setAvatar] = useState(user.profile.avatar)
  const { save, saving, error } = useSaveProfile(onClose)

  function submit(e: FormEvent) {
    e.preventDefault()
    void save({ display_name: name.trim(), avatar }, 'display_name')
  }

  return (
    <Modal open onClose={onClose} title={t('profile.editTitle')} footer={<ModalFooter onClose={onClose} saving={saving} form="edit-profile" />}>
      <form id="edit-profile" onSubmit={submit} className={styles.form}>
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

function EditInterestsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const user = useUser()
  const categories = useCategories()
  const [selected, setSelected] = useState<string[]>(user.profile.interests)
  const { save, saving, error } = useSaveProfile(onClose)

  return (
    <Modal open onClose={onClose} title={t('profile.editInterests')} footer={<ModalFooter onClose={onClose} saving={saving} onSave={() => save({ interests: selected })} />}>
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

const GOALS = [10, 15, 30, 45]

function EditPreferencesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const user = useUser()
  const [style, setStyle] = useState<PlayPreference>(user.profile.play_preference)
  const [goal, setGoal] = useState(user.profile.session_goal_minutes)
  const { save, saving, error } = useSaveProfile(onClose)

  return (
    <Modal
      open
      onClose={onClose}
      title={t('profile.editPreferences')}
      footer={<ModalFooter onClose={onClose} saving={saving} onSave={() => save({ play_preference: style, session_goal_minutes: goal })} />}
    >
      <div className={styles.form}>
        <FormError message={error} />
        <Segmented
          label={t('onboarding.styleLabel')}
          value={style}
          onChange={setStyle}
          options={(['quick', 'balanced', 'deep'] as const).map((s) => ({ value: s, label: t(`onboarding.styles.${s}`) }))}
        />
        <Segmented
          label={t('onboarding.goalLabel')}
          value={String(goal)}
          onChange={(v) => setGoal(Number(v))}
          options={GOALS.map((g) => ({ value: String(g), label: t('common.minutes', { count: g }) }))}
        />
      </div>
    </Modal>
  )
}
