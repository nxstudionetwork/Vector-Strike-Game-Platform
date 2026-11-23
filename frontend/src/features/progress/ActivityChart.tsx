/** Daily XP bar chart. Rendered as SVG with a visually hidden data table for screen readers. */
import { useTranslation } from 'react-i18next'
import type { ActivityDay } from '@/lib/api/types'
import { formatDay, formatNumber } from '@/lib/format'
import styles from './ProgressPage.module.css'

export function ActivityChart({ days }: { days: ActivityDay[] }) {
  const { t } = useTranslation()
  const max = Math.max(...days.map((d) => d.xp), 1)
  const width = 100 / days.length
  const labelEvery = days.length > 14 ? 5 : days.length > 7 ? 2 : 1
  return (
    <figure className={styles.chart}>
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className={styles.chartSvg} aria-hidden="true">
        <defs>
          <linearGradient id="bar-g" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2="100" y1={50 - f * 48} y2={50 - f * 48} className={styles.gridLine} />
        ))}
        {days.map((d, i) => {
          const h = d.xp ? Math.max((d.xp / max) * 48, 1.5) : 0.6
          return (
            <rect
              key={d.date}
              x={i * width + width * 0.18}
              y={50 - h}
              width={width * 0.64}
              height={h}
              rx={0.8}
              fill={d.xp ? 'url(#bar-g)' : 'var(--surface-3)'}
            >
              <title>{`${formatDay(d.date, { month: 'short', day: 'numeric' })}: ${formatNumber(d.xp)} XP`}</title>
            </rect>
          )
        })}
      </svg>
      <div className={styles.chartLabels} aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.date}>{i % labelEvery === 0 ? formatDay(d.date, days.length > 7 ? { day: 'numeric' } : { weekday: 'short' }) : ''}</span>
        ))}
      </div>
      <div className="visually-hidden">
      <table>
        <caption>{t('progress.chartLabel', { days: days.length })}</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{formatDay(d.date, { dateStyle: 'medium' })}</th>
              <td>{t('common.xp', { value: formatNumber(d.xp) })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
