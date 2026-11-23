import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, BookOpen, Gamepad2, Trophy, Zap } from 'lucide-react'
import { Avatar, AVATAR_KEYS } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Chip, Segmented } from '@/components/ui/Controls'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { FormError } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Logo, LogoMark } from '@/components/ui/Logo'
import { ApiError } from '@/lib/api/client'
import { meApi } from '@/lib/api/endpoints'
import type { PlayPreference } from '@/lib/api/types'
import { useCategories } from '@/lib/queries'
import { useAuth, useUser } from '@/features/auth/AuthProvider'
import styles from './OnboardingPage.module.css'

const STEPS = ['welcome', 'interests', 'preferences', 'ready'] as const
const GOALS = [10, 15, 30, 45]

export default function OnboardingPage() {
  const { t } = useTranslation()
  const user = useUser()
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const categories = useCategories()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [interests, setInterests] = useState<string[]>(user.profile.interests)
  const [style, setStyle] = useState<PlayPreference>(user.profile.play_preference)
  const [goal, setGoal] = useState(user.profile.session_goal_minutes)
  const [avatar, setAvatar] = useState(user.profile.avatar)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  const go = (to: number) => {
    setDirection(to > step ? 1 : -1)
    setStep(to)
  }

  async function finish(skipAll = false) {
    setSaving(true)
    setError(undefined)
    try {
      const updated = await meApi.completeOnboarding(
        skipAll ? {} : { interests, play_preference: style, session_goal_minutes: goal, avatar },
      )
      setUser(updated)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'))
      setSaving(false)
    }
  }

  const toggle = (slug: string) =>
    setInterests((list) => (list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]))

  const current = STEPS[step]

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Logo size={28} />
        {current !== 'ready' && (
          <Button variant="ghost" size="sm" onClick={() => finish(true)} disabled={saving}>
            {t('onboarding.skipAll')}
          </Button>
        )}
      </header>

      <div className={styles.progress} aria-label={t('onboarding.stepOf', { current: step + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => (
          <span key={s} className={i <= step ? styles.dotActive : styles.dot} />
        ))}
      </div>

      <main className={styles.stage}>
        <section
          key={current}
          className={`${styles.step} ${direction > 0 ? styles.fromRight : styles.fromLeft}`}
          aria-live="polite"
        >
            <p className={styles.stepLabel}>{t('onboarding.stepOf', { current: step + 1, total: STEPS.length })}</p>

            {current === 'welcome' && (
              <>
                <div className={styles.heroMark}>
                  <LogoMark size={72} animated />
                </div>
                <h1 className={styles.title}>{t('onboarding.welcomeTitle', { name: user.profile.display_name })}</h1>
                <p className={styles.body}>{t('onboarding.welcomeBody')}</p>
                <h2 className={styles.subTitle}>{t('onboarding.loopTitle')}</h2>
                <ol className={styles.loop}>
                  {[
                    { icon: <Gamepad2 size={20} />, label: t('onboarding.loop.play') },
                    { icon: <BookOpen size={20} />, label: t('onboarding.loop.learn') },
                    { icon: <Zap size={20} />, label: t('onboarding.loop.earn') },
                    { icon: <Trophy size={20} />, label: t('onboarding.loop.master') },
                  ].map((item, i) => (
                    <motion.li
                      key={item.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.1 }}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </motion.li>
                  ))}
                </ol>
              </>
            )}

            {current === 'interests' && (
              <>
                <h1 className={styles.title}>{t('onboarding.interestsTitle')}</h1>
                <p className={styles.body}>{t('onboarding.interestsBody')}</p>
                {categories.isPending ? (
                  <div className={styles.chips}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <Skeleton key={i} width={140} height={44} radius={999} />
                    ))}
                  </div>
                ) : categories.isError ? (
                  <ErrorState error={categories.error} onRetry={() => categories.refetch()} compact />
                ) : (
                  <>
                    <div className={styles.chips} role="group" aria-label={t('onboarding.interestsTitle')}>
                      {categories.data.map((c) => (
                        <Chip
                          key={c.slug}
                          selected={interests.includes(c.slug)}
                          onClick={() => toggle(c.slug)}
                          icon={<Icon name={c.icon} size={18} />}
                          color={c.color}
                        >
                          {t(`categories.${c.slug}`, { defaultValue: c.name })}
                        </Chip>
                      ))}
                    </div>
                    <p className={styles.count} aria-live="polite">
                      {t('onboarding.selectedCount', { count: interests.length })}
                    </p>
                  </>
                )}
              </>
            )}

            {current === 'preferences' && (
              <>
                <h1 className={styles.title}>{t('onboarding.prefsTitle')}</h1>
                <p className={styles.body}>{t('onboarding.prefsBody')}</p>
                <fieldset className={styles.styles}>
                  <legend className={styles.legend}>{t('onboarding.styleLabel')}</legend>
                  {(['quick', 'balanced', 'deep'] as const).map((s) => (
                    <label key={s} className={`${styles.styleCard} ${style === s ? styles.styleActive : ''}`}>
                      <input
                        type="radio"
                        name="play-style"
                        value={s}
                        checked={style === s}
                        onChange={() => setStyle(s)}
                        className="visually-hidden"
                      />
                      <strong>{t(`onboarding.styles.${s}`)}</strong>
                      <span>{t(`onboarding.styles.${s}Body`)}</span>
                    </label>
                  ))}
                </fieldset>
                <Segmented
                  label={t('onboarding.goalLabel')}
                  value={String(goal)}
                  onChange={(v) => setGoal(Number(v))}
                  options={GOALS.map((g) => ({ value: String(g), label: t('common.minutes', { count: g }) }))}
                />
                <fieldset className={styles.avatars}>
                  <legend className={styles.legend}>{t('onboarding.avatarLabel')}</legend>
                  <div className={styles.avatarGrid}>
                    {AVATAR_KEYS.map((key) => (
                      <label key={key} className={`${styles.avatarOption} ${avatar === key ? styles.avatarActive : ''}`}>
                        <input
                          type="radio"
                          name="avatar"
                          value={key}
                          checked={avatar === key}
                          onChange={() => setAvatar(key)}
                          className="visually-hidden"
                          aria-label={key}
                        />
                        <Avatar avatar={key} size={52} />
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {current === 'ready' && (
              <div className={styles.ready}>
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                >
                  <Avatar avatar={avatar} size={112} />
                </motion.div>
                <span className={styles.levelPill}>{t('common.level', { level: 1 })}</span>
                <h1 className={styles.title}>{t('onboarding.readyTitle')}</h1>
                <p className={styles.body}>{t('onboarding.readyBody')}</p>
              </div>
            )}

            <FormError message={error} />
        </section>
      </main>

      <footer className={styles.nav}>
        {step > 0 ? (
          <Button variant="ghost" icon={<ArrowLeft size={18} aria-hidden="true" />} onClick={() => go(step - 1)} disabled={saving}>
            {t('common.back')}
          </Button>
        ) : (
          <span />
        )}
        <div className={styles.navRight}>
          {(current === 'interests' || current === 'preferences') && (
            <Button variant="ghost" onClick={() => go(step + 1)}>
              {t('common.skip')}
            </Button>
          )}
          {current === 'ready' ? (
            <Button variant="glow" size="lg" onClick={() => finish(false)} loading={saving} iconEnd={<ArrowRight size={18} aria-hidden="true" />}>
              {t('onboarding.enter')}
            </Button>
          ) : (
            <Button variant="glow" onClick={() => go(step + 1)} iconEnd={<ArrowRight size={18} aria-hidden="true" />}>
              {t('common.next')}
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
