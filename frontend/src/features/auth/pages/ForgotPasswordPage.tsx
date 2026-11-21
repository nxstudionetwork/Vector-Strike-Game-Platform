import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { FormError, TextField } from '@/components/ui/Field'
import { ApiError } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints'
import { isEmail } from '../validation'
import { AuthLayout } from './AuthLayout'
import styles from './Auth.module.css'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isEmail(email)) {
      setError(t('auth.errors.email'))
      return
    }
    setError(undefined)
    setFormError(undefined)
    setSubmitting(true)
    try {
      await authApi.requestReset(email.trim())
      setSent(true)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('errors.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      footer={<Link to="/login">{t('auth.backToLogin')}</Link>}
    >
      {sent ? (
        <p className={styles.notice} role="status">
          {t('auth.forgotSent')}
        </p>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <FormError message={formError} />
          <TextField
            label={t('auth.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            required
            autoFocus
          />
          <Button type="submit" variant="glow" size="lg" block loading={submitting} loadingLabel={t('auth.sending')}>
            {t('auth.forgotCta')}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
