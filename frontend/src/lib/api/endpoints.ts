/** Typed endpoint functions. Components never build URLs themselves. */
import { api, type AuthPayload } from './client'
import type {
  Achievement,
  AppNotification,
  Category,
  DailyChallenge,
  GameCard,
  GameDetail,
  GameSession,
  HomeFeed,
  MeUser,
  Paginated,
  PlayerSettings,
  PlayPreference,
  Profile,
  ProgressOverview,
  SessionResult,
} from './types'

export interface SignupInput {
  email: string
  password: string
  display_name: string
  date_of_birth: string
  country?: string
  timezone?: string
  language?: string
  accept_terms: boolean
}

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthPayload>('/auth/login/', { method: 'POST', body: { email, password }, auth: false }),
  signup: (input: SignupInput) => api<AuthPayload>('/auth/signup/', { method: 'POST', body: input, auth: false }),
  logout: () => api<void>('/auth/logout/', { method: 'POST', auth: false }),
  requestReset: (email: string) =>
    api<{ detail: string }>('/auth/password-reset/', { method: 'POST', body: { email }, auth: false }),
  confirmReset: (uid: string, token: string, password: string) =>
    api<{ detail: string }>('/auth/password-reset/confirm/', {
      method: 'POST',
      body: { uid, token, password },
      auth: false,
    }),
}

export interface OnboardingInput {
  interests?: string[]
  play_preference?: PlayPreference
  session_goal_minutes?: number
  avatar?: string
}

export const meApi = {
  get: () => api<MeUser>('/me/'),
  updateProfile: (patch: Partial<Pick<Profile, 'display_name' | 'avatar' | 'country' | 'interests' | 'play_preference' | 'session_goal_minutes'>>) =>
    api<MeUser>('/me/profile/', { method: 'PATCH', body: patch }),
  updateSettings: (patch: Partial<PlayerSettings>) => api<MeUser>('/me/settings/', { method: 'PATCH', body: patch }),
  completeOnboarding: (input: OnboardingInput) => api<MeUser>('/me/onboarding/', { method: 'POST', body: input }),
  changePassword: (current_password: string, new_password: string) =>
    api<AuthPayload>('/me/password/', { method: 'POST', body: { current_password, new_password } }),
  deleteAccount: (password: string) => api<void>('/me/', { method: 'DELETE', body: { password } }),
  home: () => api<HomeFeed>('/me/home/'),
  progress: (days = 14) => api<ProgressOverview>(`/me/progress/?days=${days}`),
  achievements: () => api<{ total: number; unlocked: number; achievements: Achievement[] }>('/me/achievements/'),
  notifications: () => api<Paginated<AppNotification> & { unread: number }>('/me/notifications/?limit=30'),
  markNotificationsRead: (ids?: number[]) =>
    api<{ unread: number }>('/me/notifications/read/', { method: 'POST', body: ids ? { ids } : {} }),
}

export interface GameQuery {
  category?: string
  difficulty?: string
  q?: string
  status?: 'live' | 'coming_soon'
  favorites?: boolean
  played?: boolean
  sort?: 'featured' | 'new' | 'title'
  limit?: number
  offset?: number
}

function toQuery(params: GameQuery): string {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '' || value === false) return
    qs.set(key, value === true ? '1' : String(value))
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const catalogApi = {
  categories: () => api<Category[]>('/categories/'),
  category: (slug: string) => api<Category>(`/categories/${encodeURIComponent(slug)}/`),
  games: (params: GameQuery = {}) => api<Paginated<GameCard>>(`/games/${toQuery(params)}`),
  game: (slug: string) => api<GameDetail>(`/games/${encodeURIComponent(slug)}/`),
  favorite: (slug: string, on: boolean) =>
    api<{ is_favorite: boolean }>(`/games/${encodeURIComponent(slug)}/favorite/`, { method: on ? 'POST' : 'DELETE' }),
}

export interface CompleteInput {
  score: number
  accuracy?: number | null
  completed?: boolean
  metrics?: Record<string, unknown>
}

export const playApi = {
  start: (game: string) =>
    api<{ session: GameSession; resume_state: Record<string, unknown> }>('/play/sessions/', {
      method: 'POST',
      body: { game },
    }),
  checkpoint: (id: string, progress_percent: number, resume_state: Record<string, unknown>) =>
    api<{ progress_percent: number }>(`/play/sessions/${id}/checkpoint/`, {
      method: 'PATCH',
      body: { progress_percent, resume_state },
    }),
  complete: (id: string, input: CompleteInput) =>
    api<SessionResult>(`/play/sessions/${id}/complete/`, { method: 'POST', body: input }),
  abandon: (id: string) => api<void>(`/play/sessions/${id}/abandon/`, { method: 'POST' }),
}

export const challengeApi = {
  today: () => api<{ challenge: DailyChallenge | null }>('/challenges/today/'),
}
