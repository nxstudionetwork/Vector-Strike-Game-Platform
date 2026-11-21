/** Route guards: who may see which part of the app. */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { SplashScreen } from './SplashScreen'

/** Signed-in learners only. Sends first-time learners through onboarding. */
export function RequireAuth({ allowIncompleteOnboarding = false }: { allowIncompleteOnboarding?: boolean }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SplashScreen />
  if (status === 'anonymous' || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  if (!allowIncompleteOnboarding && !user.profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}

/** Public auth screens: signed-in learners skip straight into the app. */
export function PublicOnly() {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SplashScreen />
  if (status === 'authenticated' && user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={user.profile.onboarding_completed ? from || '/home' : '/onboarding'} replace />
  }
  return <Outlet />
}
