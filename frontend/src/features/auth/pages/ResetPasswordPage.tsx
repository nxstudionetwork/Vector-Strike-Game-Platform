import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormError, PasswordField } from '@/components/ui/Field'
import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { AuthLayout } from './AuthLayout'
import styles from './Auth.module.css'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const uid = params.get('uid') ?? ''
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError(t('auth.errors.passwordShort'))
      return
    }
    setError(undefined)
    setFormError(undefined)
    setSubmitting(true)
    try {
      await authApi.confirmReset(uid, token, password)
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && err.fieldError('password')) setError(err.fieldError('password'))
      else setFormError(err instanceof ApiError ? err.message : t('errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  const invalidLink = !uid || !token

  return (
    <AuthLayout title={t('auth.resetTitle')} footer={<Link to="/login">{t('auth.backToLogin')}</Link>}>
      {invalidLink ? (
        <>
          <FormError message={t('auth.resetInvalid')} />
          <ButtonLink to="/forgot-password" variant="secondary" block>
            {t('auth.forgotCta')}
          </ButtonLink>
        </>
      ) : done ? (
        <>
          <p className={styles.notice} role="status">
            {t('auth.resetDone')}
          </p>
          <ButtonLink to="/login" variant="glow" size="lg" block>
            {t('auth.loginCta')}
          </ButtonLink>
        </>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <FormError message={formError} />
          <PasswordField
            label={t('auth.newPassword')}
            hint={t('auth.passwordRules')}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            autoFocus
          />
          <Button type="submit" variant="glow" size="lg" block loading={submitting} loadingLabel={t('common.saving')}>
            {t('auth.resetCta')}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
