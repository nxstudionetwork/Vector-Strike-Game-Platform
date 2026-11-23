/**
 * Navigation map. Desktop sidebar groups, the mobile bottom bar and the
 * mobile "More" sheet are all derived from this one list, so a future
 * section (Tournaments, Leaderboards…) is added in one place.
 */
import {
  BarChart3,
  Gamepad2,
  Heart,
  Home,
  LineChart,
  Settings,
  Trophy,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: string
  /** Shorter label for the mobile bottom bar. */
  shortKey?: string
  icon: LucideIcon
  /** Extra path prefixes that count as "this section" (child routes). */
  matches?: string[]
  /** Shown in the mobile bottom bar (max 4 + More). */
  mobilePrimary?: boolean
}

export interface NavGroup {
  id: 'main' | 'progress' | 'personal'
  labelKey: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    labelKey: 'nav.groups.main',
    items: [
      { to: '/home', labelKey: 'nav.home', icon: Home, mobilePrimary: true },
      { to: '/game-zone', labelKey: 'nav.gameZone', shortKey: 'nav.gameZoneShort', icon: Gamepad2, matches: ['/game-zone', '/game/'], mobilePrimary: true },
      { to: '/challenge', labelKey: 'nav.dailyChallenge', shortKey: 'nav.challengeShort', icon: Zap, mobilePrimary: true },
    ],
  },
  {
    id: 'progress',
    labelKey: 'nav.groups.progress',
    items: [
      { to: '/progress', labelKey: 'nav.progress', icon: LineChart, mobilePrimary: true },
      { to: '/achievements', labelKey: 'nav.achievements', icon: Trophy },
      { to: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
    ],
  },
  {
    id: 'personal',
    labelKey: 'nav.groups.personal',
    items: [
      { to: '/favorites', labelKey: 'nav.favorites', icon: Heart },
      { to: '/profile', labelKey: 'nav.profile', icon: UserRound },
      { to: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)
export const MOBILE_PRIMARY = ALL_NAV_ITEMS.filter((i) => i.mobilePrimary)
export const MOBILE_MORE = ALL_NAV_ITEMS.filter((i) => !i.mobilePrimary)

/** True when `pathname` belongs to the nav item's section (including child routes). */
export function isSectionActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.to || pathname.startsWith(item.to + '/')) return true
  return (item.matches ?? []).some((prefix) => pathname.startsWith(prefix))
}
