import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import styles from './Field.module.css'

interface FieldShellProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string
  optionalLabel?: string
  children: ReactNode
}

function FieldShell({ id, label, hint, error, optionalLabel, children }: FieldShellProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optionalLabel && <span className={styles.optional}>{optionalLabel}</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={styles.error} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode
  hint?: ReactNode
  error?: string
  optionalLabel?: string
  trailing?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optionalLabel, trailing, id: idProp, className, ...rest },
  ref,
) {
  const autoId = useId()
  const id = idProp ?? autoId
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        <input
          ref={ref}
          id={id}
          className={`${styles.input} ${className ?? ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...rest}
        />
        {trailing}
      </div>
    </FieldShell>
  )
})

export const PasswordField = forwardRef<HTMLInputElement, Omit<TextFieldProps, 'type' | 'trailing'>>(
  function PasswordField(props, ref) {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)
    return (
      <TextField
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            className={styles.trailingButton}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        }
      />
    )
  },
)

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode
  hint?: ReactNode
  error?: string
  optionalLabel?: string
}

export function SelectField({ label, hint, error, optionalLabel, id: idProp, children, ...rest }: SelectFieldProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optionalLabel={optionalLabel}>
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        <select
          id={id}
          className={`${styles.input} ${styles.select}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...rest}
        >
          {children}
        </select>
      </div>
    </FieldShell>
  )
}

export function Checkbox({
  label,
  error,
  ...rest
}: { label: ReactNode; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId()
  return (
    <div className={styles.checkWrap}>
      <label className={styles.check} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div className={styles.formError} role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
