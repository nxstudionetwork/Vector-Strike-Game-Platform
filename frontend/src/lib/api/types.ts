/** Types mirror the Django REST API (backend/apps/*). Keep in sync with serializers. */

export type AgeGroup = 'child' | 'teen' | 'adult'
export type PlayPreference = 'quick' | 'balanced' | 'deep'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type GameStatus = 'live' | 'coming_soon'
export type ProgressStatus = 'in_progress' | 'completed' | 'mastered'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type ThemePref = 'system' | 'dark' | 'light'
export type MotionPref = 'system' | 'reduced' | 'full'
export type TextSize = 'default' | 'large' | 'xlarge'

export interface Profile {
  player_tag: string
  display_name: string
  avatar: string
  date_of_birth: string | null
  age_group: AgeGroup
  country: string
  interests: string[]
  play_preference: PlayPreference
  session_goal_minutes: number
  onboarding_completed: boolean
  created_at: string
}

export interface PlayerSettings {
  language: string
  timezone: string
  theme: ThemePref
  motion: MotionPref
  text_size: TextSize
  high_contrast: boolean
  sound_effects: boolean
  music: boolean
  sound_volume: number
  show_hints: boolean
  show_timers: boolean
  notify_achievements: boolean
  notify_daily_challenge: boolean
  notify_streak: boolean
  profile_visible: boolean
}

export interface StatsSummary {
  level: number
  total_xp: number
  level_floor_xp: number
  next_level_xp: number
  xp_into_level: number
  xp_to_next_level: number
  progress: number
  coins: number
  sessions_completed: number
  games_completed: number
  perfect_scores: number
  daily_challenges_completed: number
  current_streak: number
  longest_streak: number
  played_today: boolean
  total_play_seconds: number
  achievements_unlocked: number
}

export interface MeUser {
  id: string
  email: string
  profile: Profile
  settings: PlayerSettings
  stats: StatsSummary
}

export interface CategoryRef {
  slug: string
  name: string
  icon: string
  color: string
}

export interface Category extends CategoryRef {
  tagline: string
  description: string
  live_games: number
  upcoming_games: number
}

export interface GameProgressRef {
  status: ProgressStatus
  progress_percent: number
  best_score: number
  attempts: number
  completions: number
  last_played_at: string
}

export interface GameCard {
  slug: string
  title: string
  short_description: string
  category: CategoryRef
  difficulty: Difficulty
  status: GameStatus
  module_key: string
  estimated_minutes: number
  base_xp: number
  required_level: number
  thumbnail: string
  accent_color: string
  skills: string[]
  mechanics: string[]
  is_featured: boolean
  is_locked: boolean
  is_favorite: boolean
  progress: GameProgressRef | null
}

export interface GameDetail extends GameCard {
  description: string
  secondary_categories: CategoryRef[]
  min_age: number
  base_coins: number
  max_score: number
  metadata: Record<string, unknown>
  published_at: string | null
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Achievement {
  slug: string
  title: string
  description: string
  icon: string
  group: string
  rarity: Rarity
  threshold: number
  progress: number
  xp_reward: number
  coin_reward: number
  is_hidden: boolean
  is_unlocked: boolean
  unlocked_at: string | null
  category: string | null
}

export interface DailyChallenge {
  id: number
  date: string
  title: string
  description: string
  requirements: { min_score?: number; min_accuracy?: number }
  xp_reward: number
  coin_reward: number
  game: GameCard
  completed: boolean
  completed_at: string | null
}

export interface HomeFeed {
  stats: StatsSummary
  continue_playing: GameCard[]
  recently_played: GameCard[]
  recommended: { reason: 'interests' | 'level' | 'none'; games: GameCard[] }
  featured: GameCard[]
  new_games: GameCard[]
  daily_challenge: DailyChallenge | null
  recent_achievements: Achievement[]
  categories: (CategoryRef & { live_games: number })[]
  catalog: { live_games: number; upcoming_games: number }
}

export interface ActivityDay {
  date: string
  xp: number
  sessions: number
  play_seconds: number
}

export interface GameSession {
  id: string
  game: string
  status: 'active' | 'completed' | 'abandoned' | 'rejected'
  started_at: string
  ended_at: string | null
  score: number
  accuracy: number | null
  duration_seconds: number
  is_perfect: boolean
  xp_awarded: number
  coins_awarded: number
}

export interface ProgressOverview {
  stats: StatsSummary
  activity: ActivityDay[]
  this_week: { xp: number; sessions: number; play_seconds: number; active_days: number }
  categories: (CategoryRef & { live_games: number; games_completed: number; sessions: number; xp: number })[]
  personal_records: {
    game: { slug: string; title: string; category: string }
    best_score: number
    best_accuracy: number | null
    completions: number
    status: ProgressStatus
  }[]
  recent_sessions: (GameSession & { game_title: string })[]
}

export interface SessionResult {
  session: GameSession
  xp_awarded: number
  coins_awarded: number
  is_personal_best: boolean
  is_first_completion: boolean
  leveled_up: boolean
  previous_level: number
  level: number
  daily_challenge_completed: boolean
  daily_challenge_xp: number
  achievements_unlocked: Pick<Achievement, 'slug' | 'title' | 'description' | 'icon' | 'rarity' | 'xp_reward'>[]
  stats: StatsSummary
}

export interface AppNotification {
  id: number
  kind: 'achievement' | 'level_up' | 'daily_challenge' | 'system'
  title: string
  body: string
  link: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}
