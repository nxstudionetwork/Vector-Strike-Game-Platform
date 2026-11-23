/**
 * Settings, grouped into cards. Changes save immediately (optimistic) and are
 * confirmed with a toast; failures roll back.
 * Groups: Account · Appearance · Gameplay · Accessibility · Notifications ·
 * Language & region · Privacy · Account actions.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, KeyRound, LogOut, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Segmented, Switch } from '@/components/ui/Controls'
import { FormError, PasswordField, SelectField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Card, PageHeader } from '@/components/ui/Surfaces'
import { useConfirm } from '@/components/feedback/ConfirmDialog'
import { useToast } from '@/components/feedback/Toast'
import { useAuth, useUser } from '@/features/auth/AuthProvider'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { ApiError } from '@/lib/api/client'
import { meApi } from '@/lib/api/endpoints'
import type { PlayerSettings } from '@/lib/api/types'
import { deviceTimezone } from '@/lib/format'
import styles from './SettingsPage.module.css'

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card className={styles.group} aria-labelledby={`${id}-h`} role="region" id={id}>
      <h2 id={`${id}-h`} className={styles.groupTitle}>
        {title}
      </h2>
      <div className={styles.groupBody}>{children}</div>
    </Card>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const user = useUser()
  const { setUser, logout } = useAuth()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const toast = useToast()
  const confirm = useConfirm()
  const s = user.settings
  const [modal, setModal] = useState<'password' | 'delete' | null>(null)
  const isChild = user.profile.age_group === 'child'
  const deviceTz = deviceTimezone()

  // Deep links such as /settings#s-a11y scroll to that group.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  async function update(patch: Partial<PlayerSettings>) {
    const previous = user
    setUser({ ...user, settings: { ...s, ...patch } })
    try {
      setUser(await meApi.updateSettings(patch))
      toast.success(t('toast.settingsSaved'))
    } catch (err) {
      setUser(previous)
      toast.error(err instanceof ApiError ? err.message : t('errors.generic'))
    }
  }

  async function onLogout() {
    const ok = await confirm({ title: t('settings.logout'), body: t('settings.logoutBody'), confirmLabel: t('settings.logout') })
    if (!ok) return
    await logout()
    navigate('/welcome', { replace: true })
  }

  return (
    <>
      <PageHeader title={t('settings.title')} />

      <div className={styles.columns}>
        <Group id="s-account" title={t('settings.groups.account')}>
          <Link to="/profile" className={styles.rowLink}>
            <Avatar avatar={user.profile.avatar} size={44} />
            <span className={styles.rowText}>
              <strong>{user.profile.display_name}</strong>
              <span>{user.profile.player_tag}</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
          <dl className={styles.facts}>
            <div>
              <dt>{t('settings.email')}</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>{t('settings.ageGroup')}</dt>
              <dd>{t(`settings.ageGroups.${user.profile.age_group}`)}</dd>
            </div>
          </dl>
          <p className={styles.note}>{t('settings.emailNote')}</p>
          <div className={styles.subhead}>{t('settings.security')}</div>
          <Button variant="secondary" icon={<KeyRound size={18} aria-hidden="true" />} onClick={() => setModal('password')} className={styles.start}>
            {t('settings.changePassword')}
          </Button>
        </Group>

        <Group id="s-appearance" title={t('settings.groups.appearance')}>
          <Segmented
            label={t('settings.theme')}
            value={s.theme}
            onChange={(v) => update({ theme: v })}
            options={(['system', 'dark', 'light'] as const).map((v) => ({ value: v, label: t(`settings.themes.${v}`) }))}
          />
          <Segmented
            label={t('settings.textSize')}
            value={s.text_size}
            onChange={(v) => update({ text_size: v })}
            options={(['default', 'large', 'xlarge'] as const).map((v) => ({ value: v, label: t(`settings.textSizes.${v}`) }))}
          />
        </Group>

        <Group id="s-gameplay" title={t('settings.groups.gameplay')}>
          <Switch label={t('settings.soundEffects')} checked={s.sound_effects} onChange={(v) => update({ sound_effects: v })} />
          <Switch label={t('settings.music')} checked={s.music} onChange={(v) => update({ music: v })} />
          <label className={styles.range}>
            <span>
              {t('settings.volume')}: {s.sound_volume}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              defaultValue={s.sound_volume}
              onPointerUp={(e) => update({ sound_volume: Number((e.target as HTMLInputElement).value) })}
              onKeyUp={(e) => update({ sound_volume: Number((e.target as HTMLInputElement).value) })}
              disabled={!s.sound_effects && !s.music}
            />
          </label>
          <Switch label={t('settings.showHints')} checked={s.show_hints} onChange={(v) => update({ show_hints: v })} />
          <Switch label={t('settings.showTimers')} checked={s.show_timers} onChange={(v) => update({ show_timers: v })} />
          <p className={styles.note}>{t('settings.soundNote')}</p>
        </Group>

        <Group id="s-a11y" title={t('settings.groups.accessibility')}>
          <Segmented
            label={t('settings.motion')}
            value={s.motion}
            onChange={(v) => update({ motion: v })}
            options={(['system', 'reduced', 'full'] as const).map((v) => ({ value: v, label: t(`settings.motions.${v}`) }))}
          />
          <Switch label={t('settings.highContrast')} checked={s.high_contrast} onChange={(v) => update({ high_contrast: v })} />
          <p className={styles.note}>
            <Link to="/accessibility">{t('footer.accessibility')}</Link>
          </p>
        </Group>

        <Group id="s-notifications" title={t('settings.groups.notifications')}>
          <Switch label={t('settings.notifyAchievements')} checked={s.notify_achievements} onChange={(v) => update({ notify_achievements: v })} />
          <Switch label={t('settings.notifyDaily')} checked={s.notify_daily_challenge} onChange={(v) => update({ notify_daily_challenge: v })} />
          <Switch label={t('settings.notifyStreak')} checked={s.notify_streak} onChange={(v) => update({ notify_streak: v })} />
          <Switch label={t('settings.notifyPlatform')} checked={s.notify_platform} onChange={(v) => update({ notify_platform: v })} />
          <p className={styles.note}>{t('settings.notifyNote')}</p>
        </Group>

        <Group id="s-language" title={t('settings.groups.language')}>
          <SelectField label={t('settings.language')} hint={t('settings.languageNote')} value={s.language} onChange={(e) => update({ language: e.target.value })}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName}
              </option>
            ))}
          </SelectField>
          <div className={styles.tzRow}>
            <p className={styles.tzValue}>
              <strong>{t('settings.timezone')}:</strong> {s.timezone}
            </p>
            <p className={styles.note}>{t('settings.timezoneHint')}</p>
            {s.timezone !== deviceTz && (
              <Button variant="secondary" size="sm" className={styles.wrapButton} onClick={() => update({ timezone: deviceTz })}>
                {t('settings.useDeviceTimezone', { tz: deviceTz })}
              </Button>
            )}
          </div>
        </Group>

        <Group id="s-privacy" title={t('settings.groups.privacy')}>
          <Switch
            label={t('settings.profileVisible')}
            description={isChild ? t('settings.profileVisibleChild') : t('settings.profileVisibleHint')}
            checked={s.profile_visible}
            disabled={isChild}
            onChange={(v) => update({ profile_visible: v })}
          />
          <p className={styles.note}>
            <Link to="/privacy">{t('legal.privacyTitle')}</Link>
          </p>
        </Group>

        <Group id="s-actions" title={t('settings.groups.actions')}>
          <div className={styles.dangerRow}>
            <div>
              <strong>{t('settings.logout')}</strong>
              <p className={styles.note}>{t('settings.logoutBody')}</p>
            </div>
            <Button variant="secondary" icon={<LogOut size={18} aria-hidden="true" />} onClick={onLogout}>
              {t('settings.logout')}
            </Button>
          </div>
          <div className={styles.dangerRow}>
            <div>
              <strong>{t('settings.deleteAccount')}</strong>
              <p className={styles.note}>{t('settings.deleteBody')}</p>
            </div>
            <Button variant="danger" icon={<Trash2 size={18} aria-hidden="true" />} onClick={() => setModal('delete')}>
              {t('settings.deleteAccount')}
            </Button>
          </div>
        </Group>
      </div>

      {modal === 'password' && <ChangePasswordModal onClose={() => setModal(null)} />}
      {modal === 'delete' && <DeleteAccountModal onClose={() => setModal(null)} />}
    </>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { adoptSession } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; form?: string }>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      adoptSession(await meApi.changePassword(current, next))
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({
          current: err.fieldError('current_password'),
          next: err.fieldError('new_password') ?? err.fieldError('non_field_errors'),
          form: Object.keys(err.fields).length ? undefined : err.message,
        })
      } else setErrors({ form: t('errors.generic') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('settings.changePassword')}
      footer={
        done ? (
          <Button onClick={onClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="change-pw" loading={saving}>
              {t('settings.changePassword')}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <p role="status">{t('settings.passwordChanged')}</p>
      ) : (
        <form id="change-pw" className={styles.form} onSubmit={submit} noValidate>
          <FormError message={errors.form} />
          <PasswordField label={t('settings.currentPassword')} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
          <PasswordField label={t('auth.newPassword')} hint={t('auth.passwordRules')} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} />
        </form>
      )}
    </Modal>
  )
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      await meApi.deleteAccount(password)
      await logout().catch(() => undefined)
      navigate('/welcome', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldError('password') ?? err.message : t('errors.generic'))
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('settings.deleteConfirmTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" type="submit" form="delete-acc" loading={busy} disabled={!password}>
            {t('settings.deleteConfirmCta')}
          </Button>
        </>
      }
    >
      <form id="delete-acc" className={styles.form} onSubmit={submit} noValidate>
        <p>{t('settings.deleteConfirmBody')}</p>
        <PasswordField label={t('auth.password')} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
      </form>
    </Modal>
  )
}
