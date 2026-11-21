import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { FormError, PasswordField, TextField } from '@/components/ui/Field'
import { ApiError } from '@/lib/api/client'
import { useAuth } from '../AuthProvider'
import { isEmail } from '../validation'
import { AuthLayout } from './AuthLayout'
import styles from './Auth.module.css'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!email.trim()) next.email = t('auth.errors.required')
    else if (!isEmail(email)) next.email = t('auth.errors.email')
    if (!password) next.password = t('auth.errors.required')
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    try {
      const user = await login(email.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(user.profile.onboarding_completed ? from || '/home' : '/onboarding', { replace: true })
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : t('errors.generic') })
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')} <Link to="/signup">{t('auth.createAccount')}</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {sessionExpired && !errors.form && <div className={styles.info}>{t('auth.sessionExpired')}</div>}
        <FormError message={errors.form} />
        <TextField
          label={t('auth.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
          autoFocus
        />
        <PasswordField
          label={t('auth.password')}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Link to="/forgot-password" className={styles.inlineLink}>
          {t('auth.forgot')}
        </Link>
        <Button type="submit" variant="glow" size="lg" block loading={submitting} loadingLabel={t('auth.loggingIn')}>
          {t('auth.loginCta')}
        </Button>
      </form>
    </AuthLayout>
  )
}
