import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Spinner } from './Spinner'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glow'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  block?: boolean
  icon?: ReactNode
  iconEnd?: ReactNode
}

function classes({ variant = 'primary', size = 'md', block }: CommonProps, extra?: string) {
  return [styles.button, styles[variant], styles[size], block ? styles.block : '', extra ?? ''].join(' ')
}

export interface ButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingLabel?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, icon, iconEnd, loading, loadingLabel, children, className, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
      {!loading && iconEnd}
    </button>
  )
})

export function ButtonLink({
  variant,
  size,
  block,
  icon,
  iconEnd,
  children,
  className,
  ...rest
}: CommonProps & LinkProps) {
  return (
    <Link className={classes({ variant, size, block }, className)} {...rest}>
      {icon}
      <span>{children}</span>
      {iconEnd}
    </Link>
  )
}
