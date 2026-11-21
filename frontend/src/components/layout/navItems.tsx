import { Gamepad2, Home, LineChart, Trophy, UserRound, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: string
  /** Optional shorter label for the mobile bottom bar. */
  shortKey?: string
  icon: LucideIcon
}

/** Primary destinations. Add future sections (Challenges, Tournaments…) here. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/home', labelKey: 'nav.home', icon: Home },
  { to: '/game-zone', labelKey: 'nav.gameZone', icon: Gamepad2 },
  { to: '/progress', labelKey: 'nav.progress', icon: LineChart },
  { to: '/achievements', labelKey: 'nav.achievements', shortKey: 'nav.achievementsShort', icon: Trophy },
  { to: '/profile', labelKey: 'nav.profile', icon: UserRound },
]
