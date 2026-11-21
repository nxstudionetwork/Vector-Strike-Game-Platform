import { useId, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import styles from './Controls.module.css'

export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode
  description?: ReactNode
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className={styles.switchRow}>
      <div className={styles.switchText}>
        <label htmlFor={id} className={styles.switchLabel}>
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className={styles.switchDesc}>
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
    </div>
  )
}

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
}) {
  const name = useId()
  return (
    <fieldset className={styles.segmentedField}>
      <legend className={styles.segmentedLegend}>{label}</legend>
      <div className={styles.segmented}>
        {options.map((o) => (
          <label key={o.value} className={`${styles.segment} ${value === o.value ? styles.segmentActive : ''}`}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="visually-hidden"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Chip({
  selected,
  onClick,
  children,
  icon,
  color,
}: {
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  icon?: ReactNode
  color?: string
}) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
      aria-pressed={selected}
      onClick={onClick}
      style={color ? ({ '--chip-color': color } as React.CSSProperties) : undefined}
    >
      {icon && <span className={styles.chipIcon}>{icon}</span>}
      <span>{children}</span>
      <Check size={16} aria-hidden="true" className={`${styles.chipCheck} ${selected ? styles.chipCheckOn : ''}`} />
    </button>
  )
}
