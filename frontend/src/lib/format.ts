/** Locale-aware formatting. Always use these instead of manual string building. */
import i18n from '@/i18n'

const locale = () => i18n.language || 'en'

export function formatNumber(value: number, opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale(), opts).format(value)
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat(locale(), { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: 0 }).format(value)
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  return new Intl.DateTimeFormat(locale(), opts).format(new Date(iso))
}

/** "2026-11-21" (a calendar date, no time) → short weekday label, without timezone shifting. */
export function formatDay(isoDate: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short' }) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat(locale(), { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}

export function formatRelative(iso: string) {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs) return rtf.format(Math.round(diffSec / secs), unit)
  }
  return rtf.format(Math.round(diffSec), 'second')
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  const unit = (value: number, u: 'hour' | 'minute' | 'second') =>
    new Intl.NumberFormat(locale(), { style: 'unit', unit: u, unitDisplay: 'narrow' }).format(value)
  if (h > 0) return `${unit(h, 'hour')} ${unit(m, 'minute')}`
  if (m > 0) return `${unit(m, 'minute')}${s && m < 10 ? ` ${unit(s, 'second')}` : ''}`
  return unit(s, 'second')
}

export function countryName(code: string) {
  if (!code) return ''
  try {
    return new Intl.DisplayNames([locale()], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

export function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
