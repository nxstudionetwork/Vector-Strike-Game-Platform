/** Decorative animated "game universe" illustration (orbiting learning worlds). */
import { Icon } from '@/components/ui/Icon'
import styles from './UniverseArt.module.css'

const PLANETS = [
  { icon: 'sigma', color: '#38bdf8', orbit: 1, delay: 0 },
  { icon: 'atom', color: '#a78bfa', orbit: 2, delay: -6 },
  { icon: 'code', color: '#22d3ee', orbit: 3, delay: -3 },
  { icon: 'languages', color: '#f472b6', orbit: 2, delay: -14 },
  { icon: 'coins', color: '#4ade80', orbit: 3, delay: -18 },
  { icon: 'leaf', color: '#86efac', orbit: 1, delay: -9 },
]

export function UniverseArt() {
  return (
    <div className={styles.universe}>
      <div className={`${styles.ring} ${styles.r1}`} />
      <div className={`${styles.ring} ${styles.r2}`} />
      <div className={`${styles.ring} ${styles.r3}`} />
      <div className={styles.core}>
        <svg viewBox="0 0 64 64" width="64" height="64">
          <defs>
            <linearGradient id="ua-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22d3ee" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <path d="M8 12h12l12 30 12-30h12L38 54H26z" fill="url(#ua-g)" />
          <path d="M42 8h14l-6 14H36z" fill="#f472b6" />
        </svg>
      </div>
      {PLANETS.map((p, i) => (
        <div
          key={i}
          className={`${styles.orbiter} ${styles[`o${p.orbit}`]}`}
          style={{ animationDelay: `${p.delay}s` }}
        >
          <span className={styles.planet} style={{ '--c': p.color, animationDelay: `${p.delay}s` } as React.CSSProperties}>
            <Icon name={p.icon} size={20} />
          </span>
        </div>
      ))}
    </div>
  )
}
