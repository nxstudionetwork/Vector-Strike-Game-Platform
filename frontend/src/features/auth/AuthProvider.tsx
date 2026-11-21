/**
 * Auth state for the whole app. On launch it silently exchanges the refresh
 * cookie for an access token; if that fails the learner is anonymous.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onSessionExpired, refreshSession, setAccessToken, type AuthPayload } from '@/lib/api/client'
import { authApi, meApi, type SignupInput } from '@/lib/api/endpoints'
import type { MeUser } from '@/lib/api/types'

type Status = 'loading' | 'anonymous' | 'authenticated'

interface AuthContextValue {
  status: Status
  user: MeUser | null
  /** True when the last session ended unexpectedly (token expired / revoked). */
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<MeUser>
  signup: (input: SignupInput) => Promise<MeUser>
  logout: () => Promise<void>
  setUser: (user: MeUser) => void
  reloadUser: () => Promise<void>
  adoptSession: (payload: AuthPayload) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUserState] = useState<MeUser | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  const adoptSession = useCallback((payload: AuthPayload) => {
    setAccessToken(payload.access)
    setUserState(payload.user)
    setSessionExpired(false)
    setStatus('authenticated')
  }, [])

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUserState(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    let cancelled = false
    refreshSession()
      .then((payload) => {
        if (cancelled) return
        if (payload) adoptSession(payload)
        else setStatus('anonymous')
      })
      .catch(() => !cancelled && setStatus('anonymous'))
    return () => {
      cancelled = true
    }
  }, [adoptSession])

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      clearSession()
      setSessionExpired(true)
    })
    return () => {
      unsubscribe()
    }
  }, [clearSession])

  const login = useCallback(
    async (email: string, password: string) => {
      const payload = await authApi.login(email, password)
      adoptSession(payload)
      return payload.user
    },
    [adoptSession],
  )

  const signup = useCallback(
    async (input: SignupInput) => {
      const payload = await authApi.signup(input)
      adoptSession(payload)
      return payload.user
    },
    [adoptSession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
      setSessionExpired(false)
    }
  }, [clearSession])

  const reloadUser = useCallback(async () => {
    setUserState(await meApi.get())
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      sessionExpired,
      login,
      signup,
      logout,
      setUser: setUserState,
      reloadUser,
      adoptSession,
    }),
    [status, user, sessionExpired, login, signup, logout, reloadUser, adoptSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** For screens inside protected routes, where a user is guaranteed. */
export function useUser(): MeUser {
  const { user } = useAuth()
  if (!user) throw new Error('useUser called without an authenticated user')
  return user
}
