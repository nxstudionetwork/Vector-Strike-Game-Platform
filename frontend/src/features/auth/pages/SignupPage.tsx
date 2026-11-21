import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Checkbox, FormError, PasswordField, SelectField, TextField } from '@/components/ui/Field'
import { ApiError } from '@/lib/api/client'
import { COUNTRY_CODES } from '@/lib/countries'
import { countryName, deviceTimezone } from '@/lib/format'
import { useAuth } from '../AuthProvider'
import { ageFromDob, isEmail, passwordScore } from '../validation'
import { AuthLayout } from './AuthLayout'
import styles from './Auth.module.css'

type Field = 'email' | 'password' | 'display_name' | 'date_of_birth' | 'country' | 'accept_terms'

const STRENGTH_COLORS = ['var(--surface-3)', 'var(--danger)', 'var(--warning)', 'var(--accent)', 'var(--success)']

export default function SignupPage() {
  const { t, i18n } = useTranslation()
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    display_name: '',
    date_of_birth: '',
    country: '',
    accept_terms: false,
  })
  const [errors, setErrors] = useState<Partial<Record<Field | 'form', string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const countries = useMemo(
    () =>
      COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
        a.name.localeCompare(b.name, i18n.language),
      ),
    [i18n.language],
  )
  const today = new Date().toISOString().slice(0, 10)
  const age = form.date_of_birth ? ageFromDob(form.date_of_birth) : null
  const score = passwordScore(form.password)
  const strengthLabel = ['', 'weak', 'fair', 'good', 'strong'][score]

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key as Field]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate() {
    const e: typeof errors = {}
    if (!form.email.trim()) e.email = t('auth.errors.required')
    else if (!isEmail(form.email)) e.email = t('auth.errors.email')
    if (form.password.length < 8) e.password = t('auth.errors.passwordShort')
    if (form.display_name.trim().length < 2) e.display_name = t('auth.errors.nameShort')
    if (!form.date_of_birth) e.date_of_birth = t('auth.errors.dob')
    if (!form.accept_terms) e.accept_terms = t('auth.errors.terms')
    return e
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSubmitting(true)
    try {
      await signup({
        ...form,
        email: form.email.trim(),
        display_name: form.display_name.trim(),
        timezone: deviceTimezone(),
        language: i18n.language,
      })
      navigate('/onboarding', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        const fieldErrors: typeof errors = {}
        for (const key of Object.keys(err.fields)) {
          const field = (key === 'non_field_errors' ? 'password' : key) as Field
          fieldErrors[field] = err.fields[key][0]
        }
        setErrors(fieldErrors)
      } else {
        setErrors({ form: err instanceof ApiError ? err.message : t('errors.generic') })
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.signupTitle')}
      subtitle={t('auth.signupSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')} <Link to="/login">{t('auth.loginCta')}</Link>
        </>
      }
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <FormError message={errors.form} />
        <TextField
          label={t('auth.displayName')}
          hint={t('auth.displayNameHint')}
          autoComplete="nickname"
          maxLength={24}
          value={form.display_name}
          onChange={(e) => set('display_name', e.target.value)}
          error={errors.display_name}
          required
          autoFocus
        />
        <TextField
          label={t('auth.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
          required
        />
        <div>
          <PasswordField
            label={t('auth.password')}
            hint={t('auth.passwordRules')}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            error={errors.password}
            required
          />
          {form.password && (
            <div className={styles.strength} aria-live="polite" style={{ marginTop: 8 }}>
              <div className={styles.strengthBars} aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} style={{ background: i <= score ? STRENGTH_COLORS[score] : undefined }} />
                ))}
              </div>
              <span>{t('auth.passwordStrength.label', { value: t(`auth.passwordStrength.${strengthLabel}`) })}</span>
            </div>
          )}
        </div>
        <div className={styles.row}>
          <TextField
            label={t('auth.dob')}
            type="date"
            max={today}
            min="1900-01-01"
            autoComplete="bday"
            value={form.date_of_birth}
            onChange={(e) => set('date_of_birth', e.target.value)}
            error={errors.date_of_birth}
            required
          />
          <SelectField
            label={t('auth.country')}
            optionalLabel={t('auth.countryOptional')}
            value={form.country}
            onChange={(e) => set('country', e.target.value)}
            error={errors.country}
            autoComplete="country"
          >
            <option value="">{t('auth.countryNone')}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </SelectField>
        </div>
        <p className={styles.info}>{age !== null && age < 13 ? t('auth.under13Note') : t('auth.dobHint')}</p>
        <Checkbox
          checked={form.accept_terms}
          onChange={(e) => set('accept_terms', e.target.checked)}
          error={errors.accept_terms}
          label={
            <Trans
              i18nKey="auth.acceptTerms"
              components={{
                terms: <Link to="/terms" target="_blank" rel="noopener" />,
                privacy: <Link to="/privacy" target="_blank" rel="noopener" />,
              }}
            />
          }
        />
        <Button type="submit" variant="glow" size="lg" block loading={submitting} loadingLabel={t('auth.signingUp')}>
          {t('auth.signupCta')}
        </Button>
      </form>
    </AuthLayout>
  )
}
