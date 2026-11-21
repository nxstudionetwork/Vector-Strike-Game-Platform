/**
 * Preset generated avatars (keys come from backend/apps/accounts/avatars.py).
 * No photo uploads: learners never need to share images of themselves.
 */
import styles from './Avatar.module.css'

interface AvatarStyle {
  from: string
  to: string
  glyph: 'orbit' | 'pulse' | 'star' | 'prism' | 'comet' | 'circuit' | 'vertex' | 'wave' | 'helix' | 'ring' | 'flame' | 'tide'
}

export const AVATARS: Record<string, AvatarStyle> = {
  orbit: { from: '#22d3ee', to: '#6366f1', glyph: 'orbit' },
  pulse: { from: '#f472b6', to: '#a855f7', glyph: 'pulse' },
  nova: { from: '#fbbf24', to: '#f97316', glyph: 'star' },
  prism: { from: '#a78bfa', to: '#22d3ee', glyph: 'prism' },
  comet: { from: '#38bdf8', to: '#0ea5e9', glyph: 'comet' },
  circuit: { from: '#34d399', to: '#0891b2', glyph: 'circuit' },
  vertex: { from: '#818cf8', to: '#c026d3', glyph: 'vertex' },
  flux: { from: '#2dd4bf', to: '#84cc16', glyph: 'wave' },
  helix: { from: '#fb7185', to: '#f59e0b', glyph: 'helix' },
  quasar: { from: '#c084fc', to: '#4f46e5', glyph: 'ring' },
  ember: { from: '#f97316', to: '#e11d48', glyph: 'flame' },
  tide: { from: '#60a5fa', to: '#14b8a6', glyph: 'tide' },
}

export const AVATAR_KEYS = Object.keys(AVATARS)

function Glyph({ kind }: { kind: AvatarStyle['glyph'] }) {
  const s = { fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'orbit':
      return (
        <g {...s}>
          <ellipse cx="32" cy="32" rx="18" ry="8" transform="rotate(-25 32 32)" />
          <circle cx="32" cy="32" r="6" fill="#fff" />
        </g>
      )
    case 'pulse':
      return <path {...s} d="M12 34h10l5-12 8 22 5-10h12" />
    case 'star':
      return <path {...s} fill="#fff" d="M32 14l5 12 13 1-10 8 3 13-11-7-11 7 3-13-10-8 13-1z" />
    case 'prism':
      return <path {...s} d="M32 14l16 30H16zM32 14v30" />
    case 'comet':
      return (
        <g {...s}>
          <circle cx="40" cy="24" r="7" fill="#fff" />
          <path d="M35 29L16 48M30 24L18 36M40 31L28 43" />
        </g>
      )
    case 'circuit':
      return <path {...s} d="M16 22h12v10h10V22h10M22 42h20M32 32v10M16 22a2 2 0 1 0 0.1 0M48 22a2 2 0 1 0 0.1 0" />
    case 'vertex':
      return <path {...s} d="M14 20h10l8 20 8-20h10L36 46h-8z" />
    case 'wave':
      return <path {...s} d="M12 28c5-6 10-6 15 0s10 6 15 0 8-5 10-2M12 40c5-6 10-6 15 0s10 6 15 0 8-5 10-2" />
    case 'helix':
      return <path {...s} d="M22 14c0 12 20 12 20 18s-20 6-20 18M42 14c0 12-20 12-20 18s20 6 20 18M24 22h16M24 42h16" />
    case 'ring':
      return (
        <g {...s}>
          <circle cx="32" cy="32" r="14" />
          <circle cx="32" cy="32" r="5" fill="#fff" />
        </g>
      )
    case 'flame':
      return <path {...s} d="M32 14c8 10 12 15 12 22a12 12 0 0 1-24 0c0-5 3-8 6-11 0 5 2 8 5 8-2-7 1-13 1-19z" />
    case 'tide':
      return <path {...s} d="M12 40c6-14 18-18 26-10-6 0-9 4-7 8 4 6 14 2 21-4" />
  }
}

export function Avatar({ avatar, size = 40, label }: { avatar: string; size?: number; label?: string }) {
  const a = AVATARS[avatar] ?? AVATARS.orbit
  const gid = `av-${avatar}`
  return (
    <span className={styles.avatar} style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={a.from} />
            <stop offset="1" stopColor={a.to} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="20" fill={`url(#${gid})`} />
        <Glyph kind={a.glyph} />
      </svg>
    </span>
  )
}
